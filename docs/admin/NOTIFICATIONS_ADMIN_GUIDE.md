# Notifications Administration Guide

**Version**: 1.0 ($11.17.1)
**Last Updated**: January 12, 2026
**Status**: Production Ready
**Audience**: System Administrators

---

## Overview

The Notifications system in SMS $11.17.1 provides administrators with tools to:

- ✅ Configure notification types and behaviors
- ✅ Manage notification preferences at system level
- ✅ Monitor notification delivery and performance
- ✅ Troubleshoot notification issues
- ✅ Review notification audit logs

---

## 🎛️ Administration Panel

### Accessing Notification Administration

1. Log in as **Administrator**
2. Navigate to **Settings > System Administration**
3. Select **Notifications** from the menu
4. Choose from options below

### Admin Dashboard

The notifications dashboard shows:

- **System Status**: Notification service health
- **Message Count**: Delivered this hour/day/week
- **Active Connections**: WebSocket connections
- **Delivery Rate**: % of notifications delivered
- **Error Rate**: Failed notifications
- **Queue Depth**: Pending notifications

---

## ⚙️ Configuration

### System-Level Settings

#### Notification Service

**Enable/Disable**:
```
Settings > Notifications > Service Status
- Toggle to enable/disable all notifications
- Changes apply immediately
- Users see "Service Offline" if disabled
```

**WebSocket Configuration**:
```
Settings > Notifications > WebSocket
- Max concurrent connections: (default: 1000)
- Connection timeout: (default: 30 minutes)
- Message buffer size: (default: 1000)
- Reconnection retry: (default: automatic)
```

**Email Configuration**:
```
Settings > Notifications > Email
- SMTP server: (configured in .env)
- From address: notifications@school.edu
- Reply-to address: support@school.edu
- Subject prefix: [SMS]
- Enable daily digest: Yes/No
```

### Notification Types

**View all notification types**:
```
Settings > Notifications > Types
```

**For each type, configure**:
- ✅ **Enabled**: Turn type on/off system-wide
- ✅ **Default user setting**: New users get this preference
- ✅ **Allow user override**: Users can disable individually
- ✅ **High priority**: Always notify (can't disable)
- ✅ **Email enabled**: Default email setting for this type
- ✅ **Rate limit**: Max per user per day (optional)

**Available Types**:
- `grade_posted` - When grades are entered
- `assignment_created` - New assignment added
- `assignment_due` - Assignment deadline approaching
- `course_enrolled` - User added to course
- `course_unenrolled` - User removed from course
- `attendance_recorded` - Attendance logged
- `attendance_low` - Low attendance alert
- `announcement_posted` - Instructor announcement
- `schedule_changed` - Course schedule modified
- `permission_granted` - Admin permission assigned
- `permission_revoked` - Admin permission removed
- `import_complete` - Data import finished
- `export_ready` - Export file ready
- `system_alert` - Critical system event
- `maintenance_notice` - Maintenance scheduled

---

## 📊 Monitoring

### Real-Time Monitoring

```
Admin > Notifications > Monitor
```

**View**:
- 📈 Notifications sent (last hour/day/week)
- 📊 Delivery status breakdown (delivered/failed/pending)
- 🔴 Error rate (target: <0.5%)
- ⚡ System performance (CPU/memory usage)
- 🌐 Active WebSocket connections
- 📬 Email queue depth

### Health Checks

Run periodic health checks:

```
Admin > Notifications > Health Check
- WebSocket server: Connected/Disconnected
- Email service: Ready/Error
- Database: Connected/Error
- Queue: OK/Backlog
- Performance: Normal/Degraded
```

**Automated Health Checks**:
- Every 5 minutes during business hours
- Every 30 minutes during off-hours
- On-demand anytime

### Alert Thresholds

Configure when to alert administrators:

```
Settings > Notifications > Alerts
- Error rate threshold: (default: 5%)
- Queue depth threshold: (default: 1000)
- Connection drop threshold: (default: 50)
- Email delivery failure: (default: 10%)
- Response time > X ms: (default: 1000ms)
```

---

## 🔧 Troubleshooting

### Service Not Responding

**Symptoms**:
- Notifications not appearing
- WebSocket errors in browser console
- Notification bell shows loading

**Diagnosis**:
1. Check **Admin > Notifications > Health Check**
2. Look for "WebSocket server: Disconnected"
3. Check `backend/logs/notifications.log`

**Resolution**:
1. Restart notification service: `Admin > Notifications > Restart`
2. Check Docker logs: `docker logs -f sms-backend`
3. Verify .env settings (email, WebSocket port)
4. Contact technical support if persists

### Email Not Sending

**Symptoms**:
- Notifications appear in-app but no email
- Email delivery rate: 0%
- Users report missing emails

**Diagnosis**:
1. Check **Admin > Notifications > Monitor > Email Queue**
2. Look for queued emails in "Pending" state
3. Check `backend/logs/email.log`

**Resolution**:
1. Verify SMTP credentials in `.env`
2. Check email service status (Gmail, Office 365, etc.)
3. Verify sender address is authorized
4. Manually retry failed emails: `Admin > Notifications > Retry Failed`

### High Error Rate

**Symptoms**:
- Error rate above threshold
- Some users not receiving notifications
- Performance degradation

**Diagnosis**:
1. Check error type in `Admin > Notifications > Errors`
2. Look for patterns (specific types, specific users, specific times)
3. Check system resources (disk space, memory)
4. Check database connection status

**Resolution**:
1. Clear old notifications: `Admin > Notifications > Cleanup > Select age (30 days)`
2. Increase queue buffer: `Settings > Notifications > WebSocket > Message buffer size`
3. Scale WebSocket servers if needed
4. Archive old logs if disk is full

---

## 📋 Management Tasks

### Viewing Notifications Log

```
Admin > Notifications > Logs
```

**Filter by**:
- 🔍 User: View notifications for specific user
- 📅 Date range: Custom date selection
- 📌 Type: Filter by notification type
- ✅ Status: Delivered/Failed/Pending
- 📧 Channel: In-app/Email/Both

**Export**:
- 📥 CSV format (for analysis)
- 📊 JSON format (for integration)
- 📄 PDF report (for auditing)

### User Notification Settings

**View user settings**:
```
Admin > Users > [Select User] > Notifications
```

**Can override**:
- ☑️ Notification types enabled/disabled
- 📧 Email preferences
- 🔇 Quiet hours
- 🎯 Notification frequency

**Actions**:
- ✏️ Edit individual settings
- 🔄 Reset to defaults
- 🔐 Lock settings (prevent user changes)
- 📧 Manually send test notification

### Bulk Management

**Disable notifications for group**:
```
Admin > Notifications > Bulk Actions
- Select users
- Select action: Disable all / Disable type / Enable type
- Apply
```

**Audit settings**:
```
Admin > Notifications > Audit
- View all setting changes
- By user, date, type
- Export audit report
```

---

## 🔐 Security

### Permission Requirements

**View notifications**: `notifications:view`
**Manage settings**: `notifications:admin`
**View audit logs**: `audit:view`
**System administration**: `system:admin`

### Audit Trail

All notification changes are logged:
- Who made the change
- When the change occurred
- What was changed
- Previous value and new value

**Access audit trail**:
```
Admin > Audit > Filter: Notifications
```

### Privacy Considerations

- ✅ Users see only their own notifications
- ✅ Admins can view audit only (not user notifications)
- ✅ Email addresses not visible to users
- ✅ All email traffic encrypted
- ✅ Audit logs retained for 90 days

---

## 📊 Reports

### Pre-Built Reports

**Notification Delivery Report**:
```
Admin > Notifications > Reports > Delivery
- Total sent: (this period)
- Delivery rate: (%)
- By type breakdown
- By user breakdown
- Trends over time
```

**Email Performance Report**:
```
Admin > Notifications > Reports > Email
- Sent vs delivered
- Bounce rate
- Open rate (if tracking enabled)
- Error breakdown
```

**System Health Report**:
```
Admin > Notifications > Reports > Health
- Uptime percentage
- Error rate
- Performance metrics
- Resource usage
```

### Custom Reports

Create custom reports:
```
Admin > Notifications > Custom Report
- Select date range
- Select metrics
- Select filters
- Generate/Export
```

---

## 🚨 Incident Response

### High Priority Incidents

**Service down**:
1. Check health status
2. Restart service
3. Check logs for errors
4. Notify users of degraded service
5. Contact technical support

**High error rate**:
1. Identify error type
2. Check system resources
3. Scale if needed
4. Review recent changes
5. Monitor for recovery

**Email delivery issues**:
1. Verify SMTP credentials
2. Check email service status
3. Review failed email logs
4. Retry failed emails
5. Notify affected users

### Escalation Path

```
Error Rate > 10% →
  1. Alert administrator
  2. Check system health
  3. Scale services if needed
  4. Contact support if persists

Service Down > 5 minutes →
  1. Immediate alert
  2. Auto-restart service
  3. Manual intervention if needed
  4. Notify all users

Email Failures > 20% →
  1. Alert administrator
  2. Check SMTP credentials
  3. Review email service
  4. Manual retry if needed
```

---

## 📅 Maintenance

### Regular Tasks

**Daily**:
- Monitor error rate (should be < 0.5%)
- Check email delivery rate (should be > 95%)
- Review health check results

**Weekly**:
- Review notification logs
- Archive old notifications (>30 days)
- Check disk space
- Monitor performance trends

**Monthly**:
- Generate performance report
- Review audit log changes
- Test disaster recovery
- Update documentation

### Backup & Recovery

**Notifications are backed up**:
- ✅ Hourly: To database backup
- ✅ Daily: To off-site storage
- ✅ Retention: 90 days

**To restore notifications**:
```
Admin > Backup & Recovery > Restore
- Select date
- Preview what will be restored
- Confirm restoration
- System automatically restores
```

---

## 🆘 Support

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Notifications not appearing | Service disabled | Enable in Admin > Notifications |
| Some notifications missing | High error rate | Check health, review logs |
| Email not arriving | SMTP error | Check credentials in .env |
| Slow notification delivery | High queue depth | Increase buffer size |
| Users can't customize | Settings locked | Unlock in user admin panel |
| Storage full | Too many old notifications | Archive/delete old ones |

### Getting Help

1. **Check Health Status**: `Admin > Notifications > Health Check`
2. **Review Logs**: `backend/logs/notifications.log`
3. **Check Documentation**: This guide
4. **Contact Support**: With time, error type, and affected users

---

## 📝 Change Log

### $11.17.1 (January 12, 2026) - Initial Release
- WebSocket-based real-time notifications
- Email notification support
- User preference management
- Comprehensive monitoring and reporting
- Security and audit logging
- Health checks and alerting

### Planned for $11.17.1
- Email templates customization
- Notification batching
- Advanced filtering options
- Performance optimizations
- Mobile push notifications (optional)

---

**Version**: 1.0 ($11.17.1)
**Status**: Production Ready
**Last Updated**: January 12, 2026
**Next Review**: February 12, 2026
