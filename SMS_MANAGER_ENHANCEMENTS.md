# SMS_Manager v2 Enhancements - Status Dashboard & Health Checks

**Phase**: Implementation Ready (v1.19)  
**Effort**: 40-50 hours  
**Language**: C# (.NET 5.0)  
**Goal**: Extend SMS_Manager with status monitoring and health visibility

---

## Overview

Enhance the existing SMS_Manager.exe console application with:
1. Real-time container status dashboard
2. Health check monitoring
3. Log streaming with filtering
4. Quick troubleshooting suggestions
5. System resource monitoring (CPU, Memory)

**No GUI change** (console-only) - keeps deployment simple while dramatically improving visibility.

---

## Feature 1: Status Dashboard

### Menu Option: `5) STATUS Dashboard`

**Current Implementation (Program.cs)**:
```csharp
static async Task<int> CheckStatus()
{
    Console.WriteLine($"{RESET}\n{CYAN}📊 Checking container status...{RESET}\n");
    return await RunDockerScript("-Status");
}
```

### Enhanced Implementation

**Add to Program.cs**:

```csharp
static async Task<int> DisplayStatusDashboard()
{
    Console.Clear();
    Console.WriteLine($"{CYAN}╔═══════════════════════════════════════════════════════════════╗{RESET}");
    Console.WriteLine($"{CYAN}║ SMS STATUS DASHBOARD                                          ║{RESET}");
    Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════════╝{RESET}\n");

    var containerStatus = await GetContainerStatus();
    var health = await CheckHealthEndpoint();
    var resources = await GetContainerResources();
    var recentLogs = await GetRecentLogs(5);

    // ===== CONTAINER STATUS SECTION =====
    DisplayContainerStatus(containerStatus, health);

    // ===== RESOURCE USAGE SECTION =====
    DisplayResourceUsage(resources);

    // ===== NETWORK STATUS SECTION =====
    DisplayNetworkStatus();

    // ===== RECENT LOGS SECTION =====
    DisplayRecentLogs(recentLogs);

    // ===== TROUBLESHOOTING QUICK TIPS =====
    DisplayQuickTips(containerStatus, health);

    Console.WriteLine($"\n{CYAN}Press Enter to return to menu...{RESET}");
    Console.ReadLine();
    return 0;
}

static void DisplayContainerStatus(ContainerStatus status, HealthCheck health)
{
    Console.WriteLine($"{CYAN}╔ CONTAINER STATUS ═════════════════════════════════════════════╗{RESET}");
    
    var statusColor = status.IsRunning ? GREEN : RED;
    var statusText = status.IsRunning ? "RUNNING" : "STOPPED";
    Console.WriteLine($"{CYAN}║{RESET} Status:        {statusColor}{statusText}{RESET}");
    
    if (status.IsRunning)
    {
        Console.WriteLine($"{CYAN}║{RESET} Container ID:  {status.ContainerId.Substring(0, 12)}");
        Console.WriteLine($"{CYAN}║{RESET} Image:         {status.ImageName}:{status.ImageTag}");
        Console.WriteLine($"{CYAN}║{RESET} Started:       {status.StartedTime:g}");
        Console.WriteLine($"{CYAN}║{RESET} Uptime:        {GetUptimeString(status.StartedTime)}");
    }
    
    Console.WriteLine($"{CYAN}║{RESET}");
    
    // Health Check
    var healthColor = health.IsHealthy ? GREEN : (health.IsWarning ? YELLOW : RED);
    var healthStatus = health.IsHealthy ? "HEALTHY" : (health.IsWarning ? "DEGRADED" : "UNHEALTHY");
    Console.WriteLine($"{CYAN}║{RESET} Health:        {healthColor}{healthStatus}{RESET}");
    Console.WriteLine($"{CYAN}║{RESET} Response:      {health.ResponseTime}ms");
    
    if (!health.IsHealthy)
    {
        Console.WriteLine($"{CYAN}║{RESET} {YELLOW}Error: {health.ErrorMessage}{RESET}");
    }

    Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════════╝{RESET}\n");
}

static void DisplayResourceUsage(ContainerResources resources)
{
    Console.WriteLine($"{CYAN}╔ RESOURCE USAGE ═══════════════════════════════════════════════╗{RESET}");
    
    // CPU
    var cpuBar = GenerateProgressBar(resources.CpuPercentage, 50);
    Console.WriteLine($"{CYAN}║{RESET} CPU:            {cpuBar} {resources.CpuPercentage:F1}%");
    
    // Memory
    var memBar = GenerateProgressBar(resources.MemoryPercentage, 50);
    var memDisplay = $"{resources.MemoryUsageMB}/{resources.MemoryLimitMB} MB";
    Console.WriteLine($"{CYAN}║{RESET} Memory:         {memBar} {memDisplay}");
    
    // Disk (for mounted volumes)
    if (resources.DiskUsageMB > 0)
    {
        Console.WriteLine($"{CYAN}║{RESET} Disk:           {resources.DiskUsageMB} MB / {resources.DiskLimitMB} MB");
    }

    Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════════╝{RESET}\n");
}

static void DisplayNetworkStatus()
{
    Console.WriteLine($"{CYAN}╔ NETWORK & PORTS ══════════════════════════════════════════════╗{RESET}");
    Console.WriteLine($"{CYAN}║{RESET}");
    
    // Check if port 8080 is listening
    var portListening = IsPortListening(8080);
    var portStatus = portListening ? $"{GREEN}✓ LISTENING{RESET}" : $"{RED}✗ NOT LISTENING{RESET}";
    Console.WriteLine($"{CYAN}║{RESET} Port 8080:      {portStatus}");
    
    // Web app URL
    if (portListening)
    {
        Console.WriteLine($"{CYAN}║{RESET} Web App:        http://localhost:8080");
    }
    
    Console.WriteLine($"{CYAN}║{RESET}");
    Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════════╝{RESET}\n");
}

static void DisplayRecentLogs(List<LogEntry> logs)
{
    Console.WriteLine($"{CYAN}╔ RECENT LOGS (Last 5 lines) ═══════════════════════════════════╗{RESET}");
    
    if (logs.Count == 0)
    {
        Console.WriteLine($"{CYAN}║{RESET} (No logs available)");
    }
    else
    {
        foreach (var log in logs)
        {
            var logColor = log.Level switch
            {
                "ERROR" => RED,
                "WARN" => YELLOW,
                "INFO" => CYAN,
                _ => ""
            };
            
            // Truncate long lines
            var message = log.Message.Length > 60 
                ? log.Message.Substring(0, 57) + "..." 
                : log.Message;
            
            Console.WriteLine($"{CYAN}║{RESET} {log.Timestamp:HH:mm:ss} {logColor}[{log.Level,-5}]{RESET} {message}");
        }
    }
    
    Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════════╝{RESET}\n");
}

static void DisplayQuickTips(ContainerStatus status, HealthCheck health)
{
    var hasTips = false;
    
    Console.WriteLine($"{CYAN}╔ TROUBLESHOOTING ═════════════════════════════════════════════╗{RESET}");
    
    if (!status.IsRunning)
    {
        Console.WriteLine($"{CYAN}║{RESET} {YELLOW}ℹ Container is not running{RESET}");
        Console.WriteLine($"{CYAN}║{RESET}   Action: Select option 1 to START the container");
        hasTips = true;
    }
    
    if (status.IsRunning && !health.IsHealthy)
    {
        Console.WriteLine($"{CYAN}║{RESET} {YELLOW}ℹ Health check failed{RESET}");
        Console.WriteLine($"{CYAN}║{RESET}   Possible causes:");
        Console.WriteLine($"{CYAN}║{RESET}   • Backend still starting (wait 30 seconds)");
        Console.WriteLine($"{CYAN}║{RESET}   • Database not configured");
        Console.WriteLine($"{CYAN}║{RESET}   • Port 8080 blocked by firewall");
        Console.WriteLine($"{CYAN}║{RESET}   Action: Select option 5 to VIEW LOGS");
        hasTips = true;
    }
    
    if (resources.MemoryPercentage > 90)
    {
        Console.WriteLine($"{CYAN}║{RESET} {YELLOW}ℹ Memory usage is high (>90%){RESET}");
        Console.WriteLine($"{CYAN}║{RESET}   Action: Restart container (option 3)");
        hasTips = true;
    }
    
    if (!hasTips)
    {
        Console.WriteLine($"{CYAN}║{RESET} {GREEN}✓ All systems operating normally{RESET}");
    }
    
    Console.WriteLine($"{CYAN}╚═══════════════════════════════════════════════════════════════╝{RESET}");
}

// ===== HELPER METHODS =====

static string GenerateProgressBar(double percentage, int width)
{
    int filled = (int)(percentage / 100 * width);
    int empty = width - filled;
    
    var color = percentage switch
    {
        < 50 => GREEN,
        < 80 => YELLOW,
        _ => RED
    };
    
    return $"[{color}{'█'.ToString().PadRight(filled, '█')}{RESET}{'░'.ToString().PadRight(empty, '░')}]";
}

static string GetUptimeString(DateTime startTime)
{
    var uptime = DateTime.UtcNow - startTime;
    if (uptime.TotalHours >= 1)
        return $"{(int)uptime.TotalHours}h {uptime.Minutes}m";
    else if (uptime.TotalMinutes >= 1)
        return $"{(int)uptime.TotalMinutes}m {uptime.Seconds}s";
    else
        return $"{(int)uptime.TotalSeconds}s";
}

static bool IsPortListening(int port)
{
    try
    {
        var connections = System.Net.NetworkInformation.IPGlobalProperties
            .GetIPGlobalProperties()
            .GetActiveTcpListeners();
        
        return connections.Any(x => x.Port == port);
    }
    catch
    {
        return false;
    }
}

// ===== DATA MODELS =====

class ContainerStatus
{
    public bool IsRunning { get; set; }
    public string ContainerId { get; set; }
    public string ImageName { get; set; }
    public string ImageTag { get; set; }
    public DateTime StartedTime { get; set; }
}

class HealthCheck
{
    public bool IsHealthy { get; set; }
    public bool IsWarning { get; set; }
    public int ResponseTime { get; set; }
    public string ErrorMessage { get; set; }
}

class ContainerResources
{
    public double CpuPercentage { get; set; }
    public double MemoryPercentage { get; set; }
    public long MemoryUsageMB { get; set; }
    public long MemoryLimitMB { get; set; }
    public long DiskUsageMB { get; set; }
    public long DiskLimitMB { get; set; }
}

class LogEntry
{
    public DateTime Timestamp { get; set; }
    public string Level { get; set; }
    public string Message { get; set; }
}
```

---

## Feature 2: Docker API Integration

### Add Docker Stats Monitoring

**New File**: `installer\SMS_Manager\DockerClient.cs`

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SMS_Manager
{
    class DockerClient
    {
        private const string CONTAINER_NAME = "sms-app";

        public static async Task<ContainerStatus> GetContainerStatusAsync()
        {
            try
            {
                var (code, output, error) = await RunDockerCommand(
                    $"inspect {CONTAINER_NAME} --format=\"{{{{json .}}}}\"");

                if (code != 0)
                    return new ContainerStatus { IsRunning = false };

                using var doc = System.Text.Json.JsonDocument.Parse(output);
                var root = doc.RootElement;

                return new ContainerStatus
                {
                    IsRunning = root.GetProperty("State").GetProperty("Running").GetBoolean(),
                    ContainerId = root.GetProperty("Id").GetString().Substring(0, 12),
                    ImageName = root.GetProperty("Config").GetProperty("Image").GetString().Split(':')[0],
                    ImageTag = root.GetProperty("Config").GetProperty("Image").GetString().Split(':')[1],
                    StartedTime = DateTime.Parse(
                        root.GetProperty("State").GetProperty("StartedAt").GetString())
                };
            }
            catch
            {
                return new ContainerStatus { IsRunning = false };
            }
        }

        public static async Task<ContainerResources> GetContainerStatsAsync()
        {
            try
            {
                // Note: "no-stream" gets current stats only
                var (code, output, error) = await RunDockerCommand(
                    $"stats {CONTAINER_NAME} --no-stream --format=\"{{{{json .}}}}\"");

                if (code != 0)
                    return new ContainerResources();

                using var doc = System.Text.Json.JsonDocument.Parse(output);
                var root = doc.RootElement;

                var cpuStr = root.GetProperty("CPUPerc").GetString().TrimEnd('%');
                var memStr = root.GetProperty("MemUsage").GetString();
                
                var cpuPercent = double.TryParse(cpuStr, out var cpu) ? cpu : 0;
                
                // Parse "512MB / 2GB" format
                var memParts = memStr.Split('/');
                var used = ParseBytes(memParts[0].Trim());
                var limit = ParseBytes(memParts[1].Trim());

                return new ContainerResources
                {
                    CpuPercentage = cpuPercent,
                    MemoryUsageMB = used / (1024 * 1024),
                    MemoryLimitMB = limit / (1024 * 1024),
                    MemoryPercentage = (double)used / limit * 100
                };
            }
            catch
            {
                return new ContainerResources();
            }
        }

        public static async Task<List<LogEntry>> GetRecentLogsAsync(int lines = 5)
        {
            var result = new List<LogEntry>();
            
            try
            {
                var (code, output, error) = await RunDockerCommand(
                    $"logs --tail {lines} {CONTAINER_NAME}");

                if (code != 0)
                    return result;

                foreach (var line in output.Split('\n'))
                {
                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    result.Add(new LogEntry
                    {
                        Timestamp = DateTime.Now,
                        Level = ExtractLogLevel(line),
                        Message = line
                    });
                }
            }
            catch { }

            return result;
        }

        private static string ExtractLogLevel(string logLine)
        {
            if (logLine.Contains("ERROR", StringComparison.OrdinalIgnoreCase))
                return "ERROR";
            if (logLine.Contains("WARN", StringComparison.OrdinalIgnoreCase))
                return "WARN";
            if (logLine.Contains("DEBUG", StringComparison.OrdinalIgnoreCase))
                return "DEBUG";
            return "INFO";
        }

        private static long ParseBytes(string sizeStr)
        {
            var parts = sizeStr.Split(' ');
            if (parts.Length != 2)
                return 0;

            var value = double.Parse(parts[0]);
            return (long)(value * GetMultiplier(parts[1]));
        }

        private static long GetMultiplier(string unit) => unit.ToUpper() switch
        {
            "B" => 1,
            "KB" => 1024,
            "MB" => 1024 * 1024,
            "GB" => 1024 * 1024 * 1024,
            _ => 1
        };

        private static async Task<(int Code, string Output, string Error)> RunDockerCommand(string args)
        {
            var psi = new ProcessStartInfo
            {
                FileName = "docker",
                Arguments = args,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
                return (1, "", "Failed to start docker");

            string output = await process.StandardOutput.ReadToEndAsync();
            string error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            return (process.ExitCode, output.Trim(), error.Trim());
        }
    }
}
```

---

## Feature 3: Health Check Endpoint Monitoring

### Enhanced Health Check with Timeout

**Update Program.cs**:

```csharp
static async Task<HealthCheck> CheckHealthEndpointAsync()
{
    var url = $"http://localhost:{APP_PORT}/health/live";
    var sw = System.Diagnostics.Stopwatch.StartNew();

    try
    {
        using var http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5)
        };

        var response = await http.GetAsync(url);
        sw.Stop();

        return new HealthCheck
        {
            IsHealthy = response.IsSuccessStatusCode,
            IsWarning = response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable,
            ResponseTime = (int)sw.ElapsedMilliseconds,
            ErrorMessage = response.IsSuccessStatusCode 
                ? "" 
                : $"HTTP {(int)response.StatusCode}"
        };
    }
    catch (HttpRequestException ex)
    {
        sw.Stop();
        return new HealthCheck
        {
            IsHealthy = false,
            ResponseTime = (int)sw.ElapsedMilliseconds,
            ErrorMessage = "Connection refused (backend not ready)"
        };
    }
    catch (TaskCanceledException)
    {
        return new HealthCheck
        {
            IsHealthy = false,
            ResponseTime = 5000,
            ErrorMessage = "Health check timeout (>5s)"
        };
    }
    catch (Exception ex)
    {
        return new HealthCheck
        {
            IsHealthy = false,
            ErrorMessage = ex.Message
        };
    }
}
```

---

## Feature 4: Menu Integration

### Update DisplayMenu() and ExecuteCommand()

```csharp
static void DisplayMenu()
{
    Console.WriteLine($"{CYAN}╔═══════════════════════════════════════════════════════════╗{RESET}");
    Console.WriteLine($"{CYAN}║{RESET} Options:{RESET}");
    Console.WriteLine($"{CYAN}║{RESET}  {GREEN}1{RESET}) {BOLD}START{RESET} container and open web app");
    Console.WriteLine($"{CYAN}║{RESET}  {GREEN}2{RESET}) {BOLD}STOP{RESET} container");
    Console.WriteLine($"{CYAN}║{RESET}  {GREEN}3{RESET}) {BOLD}RESTART{RESET} container");
    Console.WriteLine($"{CYAN}║{RESET}  {GREEN}4{RESET}) {BOLD}STATUS{RESET} Dashboard (↑ NEW)");
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
            "4" => await DisplayStatusDashboard(),  // ← NEW
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
```

---

## Build & Test

### Build Command

```powershell
cd "installer\SMS_Manager"
dotnet publish -c Release --self-contained -r win-x64 /p:PublishReadyToRun=true
```

### Test Cases

```
✓ Display status dashboard when running
✓ Show "Not Running" when container stopped  
✓ Health check with timeout
✓ Display CPU/Memory correctly
✓ Show last 5 logs
✓ Display quick tips based on state
✓ Progress bar colors change with load
✓ Uptime calculation correct
✓ Port listening detection works
```

---

## Deployment

### Version Bump

```
SMS_Manager.csproj:
  <Version>2.0.0</Version>
  <InformationalVersion>2.0.0</InformationalVersion>
```

### Installer Integration

The enhanced SMS_Manager.exe will be automatically picked up by:
1. Build script copies `dist\SMS_Manager.exe` to `installer\dist\`
2. Inno Setup includes it in installation package
3. No changes needed to `.iss` file

---

## Future Enhancements (v2.1+)

- [ ] Real-time log streaming with color parsing
- [ ] Database connectivity check
- [ ] Backup status and manual trigger
- [ ] Settings editor (port, memory limit)
- [ ] Notification system for errors
- [ ] Windows system tray integration
- [ ] Performance history charts
- [ ] One-click troubleshooting actions

---

**Document Version**: 1.0  
**Created**: 2026-05-29  
