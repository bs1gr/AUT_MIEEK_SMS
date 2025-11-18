# Monitoring Integration in Power Page

## 🎉 Monitoring Dashboards Now Available at `/power`

The monitoring stack (Grafana, Prometheus, and raw metrics) has been integrated directly into the **System Health** module at:

**📍 http://localhost:8080/power**

## 🚀 What Was Added

### New Monitoring Section
A dedicated **System Monitoring** section has been added to the Power page with three tabs:

#### 1. 📊 Grafana Dashboards
- **Embedded Dashboard**: The SMS Overview dashboard is embedded directly in the page
- **Full Access Link**: Quick link to open Grafana in a new tab
- **Features**:
  - Real-time metrics visualization
  - Request rates, response times, error rates
  - Business metrics (students, enrollments, grades)
  - Database performance metrics
  - Auto-refresh every 30 seconds

#### 2. 🔍 Prometheus
- **Embedded Query Interface**: Prometheus graph interface embedded
- **Full Access Link**: Quick link to open Prometheus in a new tab
- **Features**:
  - PromQL query builder
  - Target status monitoring
  - Alert rule viewer
  - Metric exploration

#### 3. 📈 Raw Metrics
- **Live Metrics Feed**: Application metrics endpoint embedded
- **Direct Access**: View Prometheus-format metrics
- **Quick Links**: Additional resources (AlertManager, Loki, API docs)
- **Metrics Info**: List of available metric types

## 📋 Structure

```
Power Page (/power)
├── System Health (existing)
│   └── ServerControl component
├── System Monitoring (NEW!) ⭐
│   ├── Grafana Tab (embedded dashboard)
│   ├── Prometheus Tab (embedded queries)
│   └── Raw Metrics Tab (metrics endpoint)
└── Control Panel (existing)
    └── Operations, Diagnostics, Logs, etc.
```

## 🎯 Usage

### Access the Monitoring
1. Navigate to: **http://localhost:8080/power**
2. Scroll to the **System Monitoring** section
3. Click on any tab: Grafana / Prometheus / Raw Metrics

### View Options
- **Embedded View**: See dashboards directly in the application
- **Full Window**: Click "Open..." buttons to view in dedicated tabs
- **Toggle Visibility**: Use "Hide/Show Monitoring" button to collapse section

### Default Credentials
- **Grafana**: admin / admin
- **Prometheus**: No authentication required
- **Metrics**: No authentication required

## 🔧 Technical Details

### Files Modified
1. **`frontend/src/pages/PowerPage.tsx`**
   - Added monitoring section with tab navigation
   - Embedded iframes for Grafana, Prometheus, and metrics
   - Added collapsible panel with state management

2. **`frontend/src/locales/en/controlPanel.js`**
   - Added monitoring translations (English)

3. **`frontend/src/locales/el/controlPanel.js`**
   - Added monitoring translations (Greek)

### Translation Keys Added
```javascript
monitoring: {
  title: 'System Monitoring',
  hide: 'Hide Monitoring',
  show: 'Show Monitoring',
  grafana: 'Grafana Dashboards',
  prometheus: 'Prometheus',
  rawMetrics: 'Raw Metrics',
  grafanaDesc: '...',
  prometheusDesc: '...',
  metricsDesc: '...',
  openGrafana: 'Open Grafana',
  openPrometheus: 'Open Prometheus',
  viewMetrics: 'View Raw Metrics',
  credentials: 'Default Credentials',
}
```

## 📊 Available Metrics

When viewing the monitoring dashboards, you can see:

### HTTP Metrics
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Slow requests (>1s)

### Business Metrics
- Active students count
- Total enrollments
- Grades submitted
- Attendance records

### Database Metrics
- Query duration
- Connection count
- Error rate

### Authentication Metrics
- Login attempts (success/failed)
- Active sessions
- Account lockouts

### Cache Metrics
- Hit rate
- Miss rate

## 🌐 Access URLs

All monitoring services are accessible:

| Service | URL | Embedded In | Opens In |
|---------|-----|-------------|----------|
| **Power Page** | http://localhost:8080/power | N/A | Same window |
| **Grafana** | http://localhost:3000 | ✅ Yes | New tab available |
| **Prometheus** | http://localhost:9090 | ✅ Yes | New tab available |
| **Metrics** | http://localhost:8000/metrics | ✅ Yes | New tab available |
| **AlertManager** | http://localhost:9093 | ❌ No | New tab link |
| **Loki** | http://localhost:3100 | ❌ No | New tab link |

## 🎨 UI Features

### Responsive Design
- Full-width embedded dashboards
- Proper iframe sizing (800px height for Grafana/Prometheus, 600px for metrics)
- Collapsible sections to save space

### Visual Indicators
- Color-coded info boxes (blue for Grafana, orange for Prometheus, green for metrics)
- Icons for easy identification (📊 📈 🔍)
- External link indicators

### Bilingual Support
- All text translated to Greek and English
- Consistent with existing localization patterns

## 🔄 How to Use After Build

1. **Ensure monitoring stack is running**:
   ```powershell
   .\RUN.ps1 -WithMonitoring
   ```

2. **Access the application**:
   - Open browser to http://localhost:8080
   - Login if authentication is enabled

3. **Navigate to Power page**:
   - Click the "Power" tab in the navigation
   - Or go directly to http://localhost:8080/power

4. **Explore monitoring**:
   - Expand the "System Monitoring" section
   - Switch between Grafana, Prometheus, and Raw Metrics tabs
   - Use "Open..." buttons for full-screen views

## ⚠️ Prerequisites

For monitoring to work, you must have:
- ✅ Monitoring stack running (`.\RUN.ps1 -WithMonitoring`)
- ✅ Prometheus on port 9090
- ✅ Grafana on port 3000
- ✅ Application metrics enabled (ENABLE_METRICS=1)

## 🆘 Troubleshooting

### "Unable to connect" in embedded dashboards
**Cause**: Monitoring services not running  
**Solution**: Run `.\RUN.ps1 -WithMonitoring` or `.\SMS.ps1 -WithMonitoring`

### Grafana shows login screen
**Cause**: Not logged in to Grafana  
**Solution**: Click "Open Grafana" button and login (admin/admin), then return to Power page

### Metrics show "404 Not Found"
**Cause**: ENABLE_METRICS not set or backend not running  
**Solution**: Set ENABLE_METRICS=1 in backend/.env and restart

### Dashboard not loading
**Cause**: Dashboard may not exist in Grafana  
**Solution**: Import dashboard from `monitoring/grafana/dashboards/sms-overview.json`

## 📝 Next Steps

### For Users
1. Explore the monitoring dashboards
2. Set up AlertManager notifications (email/Slack)
3. Create custom Grafana dashboards
4. Monitor application health regularly

### For Developers
1. Add more metrics to the application
2. Create additional Grafana panels
3. Set up custom alert rules
4. Integrate with external monitoring services

## 🎊 Success!

You now have **enterprise-grade monitoring** integrated directly into your application's System Health module. No need to remember separate ports or URLs - everything is accessible from:

**👉 http://localhost:8080/power**

Enjoy your new monitoring capabilities! 📊✨
