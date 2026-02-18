using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace SMS_Manager
{
    /// <summary>
    /// Student Management System - Docker Container Manager
    /// Minimal console application for managing SMS Docker containers.
    /// No external dependencies, single-file executable.
    /// </summary>
    class Program
    {
        private static readonly string SMS_APP_CONTAINER = "sms-app";
        private static readonly string SMS_APP_IMAGE = "sms-fullstack";
        private static readonly int APP_PORT = 8080;
        private static readonly string INSTALL_DIR = GetInstallDirectory();
        private static readonly string COMPOSE_FILE = Path.Combine(INSTALL_DIR, "docker", "docker-compose.yml");
        private static readonly string DOCKER_SCRIPT = Path.Combine(INSTALL_DIR, "DOCKER.ps1");
        private const int START_TIMEOUT_SECONDS = 300;

        // ANSI color codes for terminal output (enabled only when supported)
        private const string ANSI_RESET = "\u001b[0m";
        private const string ANSI_BOLD = "\u001b[1m";
        private const string ANSI_GREEN = "\u001b[32m";
        private const string ANSI_RED = "\u001b[31m";
        private const string ANSI_YELLOW = "\u001b[33m";
        private const string ANSI_CYAN = "\u001b[36m";

        private static string RESET = "";
        private static string BOLD = "";
        private static string GREEN = "";
        private static string RED = "";
        private static string YELLOW = "";
        private static string CYAN = "";

        private const int STD_OUTPUT_HANDLE = -11;
        private const int ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GetStdHandle(int nStdHandle);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetConsoleMode(IntPtr hConsoleHandle, out int lpMode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleMode(IntPtr hConsoleHandle, int dwMode);

        static async Task<int> Main(string[] args)
        {
            try
            {
                ConfigureConsole();

                // Request admin elevation if not already elevated
                if (!IsElevated())
                {
                    RequestAdminElevation();
                    return 0;
                }

                DisplayHeader();

                // If launched with argument, execute directly (no menu)
                if (args.Length > 0)
                {
                    return await ExecuteCommand(args[0].ToLower());
                }

                // Interactive menu loop
                while (true)
                {
                    DisplayMenu();
                    string choice = Console.ReadLine()?.ToLower().Trim() ?? "";

                    if (choice == "q")
                        break;

                    int result = await ExecuteCommand(choice);
                    if (result != 0 && choice != "")
                    {
                        Console.WriteLine($"\n{RED}❌ Command failed. Press Enter to return to menu.{RESET}");
                        Console.ReadLine();
                    }

                    Console.WriteLine($"\n{CYAN}Press Enter to continue...{RESET}");
                    Console.ReadLine();
                    Console.Clear();
                    DisplayHeader();
                }

                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n{RED}Fatal error: {ex.Message}{RESET}");
                Console.ReadLine();
                return 1;
            }
        }

        static void DisplayHeader()
        {
            Console.Clear();
            Console.WriteLine($@"{CYAN}");
            Console.WriteLine("╔════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║    Student Management System - Docker Manager                  ║");
            Console.WriteLine("║                                                                ║");
            Console.WriteLine("║       Quick Container Control Menu                             ║");
            Console.WriteLine("╚════════════════════════════════════════════════════════════════╝");
            Console.WriteLine($"{RESET}\n");
        }

        static void DisplayMenu()
        {
            Console.WriteLine($"{CYAN}╔═══════════════════════════════════════════════════════════╗{RESET}");
            Console.WriteLine($"{CYAN}║{RESET} Options:{RESET}");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}1{RESET}) {BOLD}START{RESET} container and open web app");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}2{RESET}) {BOLD}STOP{RESET} container");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}3{RESET}) {BOLD}RESTART{RESET} container");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}4{RESET}) {BOLD}CHECK{RESET} container status");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}5{RESET}) {BOLD}VIEW{RESET} container logs");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}6{RESET}) {BOLD}OPEN{RESET} web app (if running)");
            Console.WriteLine($"{CYAN}║{RESET}  {GREEN}Q{RESET}) {BOLD}QUIT{RESET}");
            Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════╝{RESET}");
            Console.Write($"\nSelect option [1-6, Q]: {BOLD}");
        }

        static async Task<int> ExecuteCommand(string choice)
        {
            try
            {
                return choice switch
                {
                    "1" => await StartContainer(),
                    "2" => await StopContainer(),
                    "3" => await RestartContainer(),
                    "4" => await CheckStatus(),
                    "5" => await ViewLogs(),
                    "6" => await OpenWebApp(),
                    _ => HandleInvalidChoice()
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{RED}Error: {ex.Message}{RESET}");
                return 1;
            }
        }

        static async Task<int> StartContainer()
        {
            Console.WriteLine($"{RESET}\n{CYAN}🚀 Starting SMS container...{RESET}");

            // Check if Docker is running
            if (!await IsDockerRunning())
            {
                Console.WriteLine($"{RED}❌ Docker Desktop is not running.{RESET}");
                Console.WriteLine($"{YELLOW}Please start Docker Desktop and try again.{RESET}");
                return 1;
            }

            // Delegate runtime strategy to DOCKER.ps1 (fullstack vs compose mode)
            int code = await RunDockerScript("-Start", START_TIMEOUT_SECONDS);

            // If startup exceeded timeout, verify if app is actually reachable.
            // This avoids false "stuck" states when the backend is still finalizing.
            if (code == 124)
            {
                Console.WriteLine($"{YELLOW}⚠ Startup command is still running after timeout check. Verifying service availability...{RESET}");
                bool runtimeRunning = await IsSmsRuntimeRunning();
                bool webReady = await IsWebAppReachable();

                if (runtimeRunning && webReady)
                {
                    Console.WriteLine($"{GREEN}✓ SMS is running and reachable at http://localhost:{APP_PORT}{RESET}");
                    return 0;
                }
            }

            if (code == 0)
            {
                Console.WriteLine($"\n{GREEN}✓ Container started successfully.{RESET}");
            }
            else
            {
                Console.WriteLine($"{RED}❌ Failed to start container.{RESET}");
            }

            return code;
        }

        static async Task<int> StopContainer()
        {
            Console.WriteLine($"{RESET}\n{CYAN}🛑 Stopping SMS container...{RESET}");
            int code = await RunDockerScript("-Stop");

            if (code == 0)
            {
                Console.WriteLine($"{GREEN}✓ Container stopped successfully.{RESET}");
            }
            else
            {
                Console.WriteLine($"{RED}❌ Failed to stop container.{RESET}");
            }

            return code;
        }

        static async Task<int> RestartContainer()
        {
            Console.WriteLine($"{RESET}\n{CYAN}🔄 Restarting SMS container...{RESET}");
            int code = await RunDockerScript("-Restart");

            if (code == 0)
            {
                Console.WriteLine($"{GREEN}✓ Container restarted successfully.{RESET}");
                Console.WriteLine($"{YELLOW}Waiting 3 seconds for service to be ready...{RESET}");
                await Task.Delay(3000);
                await OpenWebApp();
            }
            else
            {
                Console.WriteLine($"{RED}❌ Failed to restart container.{RESET}");
            }

            return code;
        }

        static async Task<int> CheckStatus()
        {
            Console.WriteLine($"{RESET}\n{CYAN}📊 Checking container status...{RESET}\n");
            return await RunDockerScript("-Status");
        }

        static async Task<int> ViewLogs()
        {
            Console.WriteLine($"{RESET}\n{CYAN}📋 Container logs:{RESET}\n");
            Console.WriteLine($"{YELLOW}Tip: Press Ctrl+C to stop log streaming.{RESET}\n");
            return await RunDockerScript("-Logs");
        }

        static async Task<int> OpenWebApp()
        {
            Console.WriteLine($"{RESET}\n{CYAN}🌐 Opening web application...{RESET}");
            try
            {
                string url = $"http://localhost:{APP_PORT}";
                Console.WriteLine($"{GREEN}↳ {url}{RESET}");

                // Platform-specific URL opening
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd",
                        Arguments = $"/c start {url}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    });
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    Process.Start("xdg-open", url);
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                {
                    Process.Start("open", url);
                }

                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{YELLOW}⚠ Could not open browser: {ex.Message}{RESET}");
                Console.WriteLine($"Please open manually: http://localhost:{APP_PORT}");
                return 1;
            }
        }

        static int HandleInvalidChoice()
        {
            Console.WriteLine($"{RESET}{RED}Invalid selection. Please try again.{RESET}");
            return 1;
        }

        // ==================== HELPER METHODS ====================

        static async Task<int> RunDockerCompose(string args)
        {
            if (!File.Exists(COMPOSE_FILE))
            {
                Console.WriteLine($"{RED}❌ Compose file not found: {COMPOSE_FILE}{RESET}");
                Console.WriteLine($"{YELLOW}⚠ Verify installation folder contains docker\\docker-compose.yml{RESET}");
                return 1;
            }

            string composeArgs = $"-f \"{COMPOSE_FILE}\" {args}";

            int code = await RunCommand("docker", $"compose {composeArgs}");
            if (code == 0)
            {
                return 0;
            }

            Console.WriteLine($"{YELLOW}⚠ 'docker compose' failed, trying 'docker-compose' fallback...{RESET}");
            return await RunCommand("docker-compose", composeArgs);
        }

        static async Task<int> RunDockerScript(string scriptArgs, int timeoutSeconds = 0)
        {
            if (!File.Exists(DOCKER_SCRIPT))
            {
                Console.WriteLine($"{RED}❌ DOCKER.ps1 not found: {DOCKER_SCRIPT}{RESET}");
                return 1;
            }

            string? shell = ResolvePowerShell();
            if (string.IsNullOrWhiteSpace(shell))
            {
                Console.WriteLine($"{RED}❌ PowerShell not found. Cannot run DOCKER.ps1.{RESET}");
                return 1;
            }

            string args = $"-NoProfile -ExecutionPolicy Bypass -File \"{DOCKER_SCRIPT}\" {scriptArgs}";
            return await RunCommand(shell, args, timeoutSeconds);
        }

        static string? ResolvePowerShell()
        {
            string[] candidates =
            {
                @"C:\Program Files\PowerShell\7\pwsh.exe",
                @"C:\Program Files (x86)\PowerShell\7\pwsh.exe",
                @"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
                "pwsh",
                "powershell"
            };

            foreach (string candidate in candidates)
            {
                if (candidate.Contains('\\'))
                {
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                    continue;
                }

                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = candidate,
                        Arguments = "-NoProfile -Command \"exit 0\"",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };

                    using var process = Process.Start(psi);
                    if (process == null)
                    {
                        continue;
                    }

                    process.WaitForExit(3000);
                    if (process.ExitCode == 0)
                    {
                        return candidate;
                    }
                }
                catch
                {
                    // Try next candidate
                }
            }

            return null;
        }

        static async Task<int> RunCommand(string command, string args, int timeoutSeconds = 0)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = args,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                using var process = Process.Start(psi);
                if (process == null)
                {
                    Console.WriteLine($"{RED}Error: Failed to start process '{command}'.{RESET}");
                    return 1;
                }

                var outputBuilder = new StringBuilder();
                var errorBuilder = new StringBuilder();

                process.OutputDataReceived += (_, e) =>
                {
                    if (string.IsNullOrWhiteSpace(e.Data))
                    {
                        return;
                    }

                    outputBuilder.AppendLine(e.Data);
                    Console.WriteLine(e.Data);
                };

                process.ErrorDataReceived += (_, e) =>
                {
                    if (string.IsNullOrWhiteSpace(e.Data))
                    {
                        return;
                    }

                    errorBuilder.AppendLine(e.Data);
                    Console.WriteLine(e.Data);
                };

                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                var waitTask = process.WaitForExitAsync();
                if (timeoutSeconds > 0)
                {
                    var timeoutTask = Task.Delay(TimeSpan.FromSeconds(timeoutSeconds));
                    var completedTask = await Task.WhenAny(waitTask, timeoutTask);
                    if (completedTask != waitTask)
                    {
                        try
                        {
                            if (!process.HasExited)
                            {
                                process.Kill(entireProcessTree: true);
                            }
                        }
                        catch
                        {
                            // Best effort kill; if it already exited ignore
                        }

                        Console.WriteLine($"{YELLOW}⚠ Command timed out after {timeoutSeconds} seconds.{RESET}");
                        return 124;
                    }
                }

                await waitTask;

                return process.ExitCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{RED}Error running command: {ex.Message}{RESET}");
                return 1;
            }
        }

        static async Task<bool> IsSmsRuntimeRunning()
        {
            try
            {
                var byName = await RunCommandCapture("docker", $"ps --filter \"name=^{SMS_APP_CONTAINER}$\" --format \"{{{{.ID}}}}\"");
                if (byName.ExitCode == 0 && !string.IsNullOrWhiteSpace(byName.Output))
                {
                    return true;
                }

                var byImage = await RunCommandCapture("docker", $"ps --filter \"ancestor={SMS_APP_IMAGE}\" --format \"{{{{.ID}}}}\"");
                return byImage.ExitCode == 0 && !string.IsNullOrWhiteSpace(byImage.Output);
            }
            catch
            {
                return false;
            }
        }

        static async Task<bool> IsWebAppReachable()
        {
            string url = $"http://localhost:{APP_PORT}/";

            try
            {
                using var http = new HttpClient
                {
                    Timeout = TimeSpan.FromSeconds(4)
                };

                for (int attempt = 0; attempt < 5; attempt++)
                {
                    try
                    {
                        using var response = await http.GetAsync(url);
                        if ((int)response.StatusCode >= 200 && (int)response.StatusCode < 600)
                        {
                            return true;
                        }
                    }
                    catch
                    {
                        // Keep retrying while service warms up
                    }

                    await Task.Delay(1000);
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        static async Task<(int ExitCode, string Output, string Error)> RunCommandCapture(string command, string args)
        {
            var psi = new ProcessStartInfo
            {
                FileName = command,
                Arguments = args,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                return (1, string.Empty, "Failed to start process");
            }

            string output = await process.StandardOutput.ReadToEndAsync();
            string error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            return (process.ExitCode, output?.Trim() ?? string.Empty, error?.Trim() ?? string.Empty);
        }

        static void ConfigureConsole()
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                EnableAnsiColors();
                return;
            }

            if (TryEnableVirtualTerminalProcessing())
            {
                EnableAnsiColors();
            }
        }

        static void EnableAnsiColors()
        {
            RESET = ANSI_RESET;
            BOLD = ANSI_BOLD;
            GREEN = ANSI_GREEN;
            RED = ANSI_RED;
            YELLOW = ANSI_YELLOW;
            CYAN = ANSI_CYAN;
        }

        static bool TryEnableVirtualTerminalProcessing()
        {
            try
            {
                IntPtr handle = GetStdHandle(STD_OUTPUT_HANDLE);
                if (handle == IntPtr.Zero || handle == new IntPtr(-1))
                {
                    return false;
                }

                if (!GetConsoleMode(handle, out int mode))
                {
                    return false;
                }

                if ((mode & ENABLE_VIRTUAL_TERMINAL_PROCESSING) != ENABLE_VIRTUAL_TERMINAL_PROCESSING)
                {
                    mode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
                    if (!SetConsoleMode(handle, mode))
                    {
                        return false;
                    }
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        static async Task<bool> IsDockerRunning()
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = "info",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                using var process = Process.Start(psi);
                if (process == null)
                {
                    return false;
                }

                await process.StandardOutput.ReadToEndAsync();
                await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                int code = process.ExitCode;
                return code == 0;
            }
            catch
            {
                return false;
            }
        }

        static bool IsElevated()
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return true; // Skip on non-Windows

            try
            {
                var id = System.Security.Principal.WindowsIdentity.GetCurrent();
                var principal = new System.Security.Principal.WindowsPrincipal(id);
                return principal.IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }

        static void RequestAdminElevation()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName,
                        Verb = "runas",
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                    System.Environment.Exit(0);
                }
                catch
                {
                    Console.WriteLine("Please run this application as Administrator.");
                    Console.ReadLine();
                }
            }
        }

        static string GetInstallDirectory()
        {
            // Try to find INSTALL_DIR from registry or environment
            try
            {
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    var regPath = @"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}_is1";
                    var installPath = Microsoft.Win32.Registry.GetValue(regPath, "InstallLocation", null) as string;
                    if (!string.IsNullOrEmpty(installPath) && Directory.Exists(installPath))
                    {
                        return installPath;
                    }
                }
            }
            catch { }

            // Fallback: parent directory of this EXE
            return Path.GetDirectoryName(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName);
        }
    }
}
