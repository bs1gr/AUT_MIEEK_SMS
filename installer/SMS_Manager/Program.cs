using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
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
        private static readonly string SMS_IMAGE = "sms:latest";
        private static readonly int APP_PORT = 8080;
        private static readonly string INSTALL_DIR = GetInstallDirectory();

        // ANSI color codes for terminal output
        private const string RESET = "\x1b[0m";
        private const string BOLD = "\x1b[1m";
        private const string GREEN = "\x1b[32m";
        private const string RED = "\x1b[31m";
        private const string YELLOW = "\x1b[33m";
        private const string CYAN = "\x1b[36m";

        static async Task<int> Main(string[] args)
        {
            try
            {
                // Request admin elevation if not already elevated
                if (!IsElevated())
                {
                    RequestAdminElevation();
                    return 0;
                }

                Console.OutputEncoding = System.Text.Encoding.UTF8;
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

            // Run docker compose up
            int code = await RunDockerCompose("up -d");
            if (code == 0)
            {
                Console.WriteLine($"\n{GREEN}✓ Container started successfully.{RESET}");
                Console.WriteLine($"{YELLOW}Waiting 3 seconds for service to be ready...{RESET}");
                await Task.Delay(3000);

                // Try to open web app
                await OpenWebApp();
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
            int code = await RunDockerCompose("down");

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

            if (!await IsDockerRunning())
            {
                Console.WriteLine($"{RED}❌ Docker Desktop is not running.{RESET}");
                return 1;
            }

            await RunDockerCompose("down");
            await Task.Delay(2000);
            int code = await RunDockerCompose("up -d");

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

            // Check Docker
            bool dockerRunning = await IsDockerRunning();
            if (dockerRunning)
            {
                Console.WriteLine($"{GREEN}✓ Docker Desktop is running{RESET}");
            }
            else
            {
                Console.WriteLine($"{RED}✗ Docker Desktop is NOT running{RESET}");
                return 1;
            }

            // Check container
            int code = await RunCommand("docker", "ps --filter name=sms-app --format \"table {{.Names}}\\t{{.Status}}\"");
            return code;
        }

        static async Task<int> ViewLogs()
        {
            Console.WriteLine($"{RESET}\n{CYAN}📋 Container logs (last 50 lines):{RESET}\n");
            int code = await RunCommand("docker", "logs --tail 50 sms-app");

            if (code != 0)
            {
                Console.WriteLine($"{YELLOW}⚠ Container not running or not found.{RESET}");
            }

            return code;
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
            return await RunCommand(
                "docker",
                $"compose -f \"{Path.Combine(INSTALL_DIR, "docker", "docker-compose.yml")}\" {args}"
            );
        }

        static async Task<int> RunCommand(string command, string args)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = args,
                    UseShellExecute = false,
                    RedirectStandardOutput = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(psi);
                await process.WaitForExitAsync();
                return process.ExitCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{RED}Error running command: {ex.Message}{RESET}");
                return 1;
            }
        }

        static async Task<bool> IsDockerRunning()
        {
            try
            {
                int code = await RunCommand("docker", "info");
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
