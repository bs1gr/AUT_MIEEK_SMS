# Custom Dashboards User Guide

## Overview

Custom Dashboards allow you to personalize your analytics view by selecting which charts to display. Instead of viewing all 10 available charts every time, create focused dashboards for specific analytical needs.

**Benefits:**
- Faster analytics page load (fewer charts to render)
- Focused analysis (only relevant charts visible)
- Multiple perspectives (create different dashboards for different needs)
- Quick switching between views

---

## Getting Started

### Accessing Dashboard Manager

**From Analytics Page:**
1. Click "Analytics" in main navigation
2. Look for the dashboard selector dropdown (shows "Default Dashboard" by default)
3. Click "Manage" button to open Dashboard Manager

**Direct URL:**
- Navigate to `/dashboard-manager`

### Dashboard Manager Interface

The Dashboard Manager shows:
- **List of all your dashboards** with card format
- **New Dashboard button** (top right) to create new ones
- **Each dashboard card displays:**
  - Dashboard name
  - Optional description
  - Number of charts included
  - Creation date
  - Action buttons (Edit, Delete, Set Default)

---

## Creating a Custom Dashboard

### Step 1: Open Create Dialog
1. Click "New Dashboard" button (top right)
2. A modal form will appear

### Step 2: Fill Dashboard Details
**Dashboard Name** (required)
- Name your dashboard (e.g., "Math Performance Overview")
- Max 255 characters
- Must be unique among your dashboards
- Error if you try to use duplicate name

**Description** (optional)
- Add notes about the dashboard
- Max 500 characters
- Examples: "For parent-teacher conferences", "Weekly review"

### Step 3: Select Charts
Choose which charts to include (minimum 1 required):

**Available Charts:**
1. **Performance Chart** - Student performance metrics
2. **Grade Distribution** - Grade range analysis
3. **Attendance Chart** - Attendance patterns
4. **Trend Chart** - Performance trends over time
5. **Student Status** - Student enrollment status pie chart
6. **Scatter Plot** - Attendance vs grade correlation
7. **Heatmap** - Grade distribution by week
8. **Sankey Diagram** - Student progression flow
9. **Treemap** - Hierarchical performance view
10. **Box Plot** - Statistical distribution analysis

**Chart Count Display:**
- Shows "0 chart(s) selected" initially
- Updates as you check boxes
- "3 chart(s) selected" when 3 are checked

### Step 4: Save Dashboard
1. Click "Save" button
2. Form validates:
   - ❌ Name required → Error appears
   - ❌ At least 1 chart required → Error appears
   - ✅ All valid → Dashboard created
3. Returns to Dashboard Manager
4. Your new dashboard appears in the list

---

## Using Custom Dashboards

### Selecting a Dashboard

**In Analytics Page:**
1. Look for dashboard selector dropdown (left side of filters)
2. Default shows "Default Dashboard"
3. Click dropdown to see all your dashboards
4. Select desired dashboard
5. Page automatically filters to show only selected charts
6. Charts re-render to show new view

**Quick Switch:**
- Use dropdown to switch between dashboards instantly
- No page reload required
- Filters and selections persist

### Setting a Default Dashboard

**Why:** Default dashboard auto-loads when you visit analytics page

**How to set:**
1. Open Dashboard Manager
2. Find dashboard you want as default
3. Click star icon (✓ button) on its card
4. Confirmation happens instantly
5. Badge changes from "Default" to previous dashboard

**Only one default per user:**
- Setting new default automatically unsets previous one
- If no default selected, all charts display

---

## Editing Dashboards

### Modifying a Dashboard

1. **Open Dashboard Manager**
2. **Find dashboard** in the list
3. **Click pencil icon** (Edit button)
4. Modal opens with pre-filled data:
   - Name field has current name
   - Description field has current description
   - Chart checkboxes show currently selected charts
5. **Make changes:**
   - Update name
   - Update description
   - Check/uncheck charts
   - Validation works same as create
6. **Click Save**
   - Changes applied immediately
   - Returns to manager view
   - Dashboard updated

### Common Edit Scenarios

**Add more charts:**
- Click edit
- Check additional charts
- Save

**Remove a chart:**
- Click edit
- Uncheck chart
- Must keep at least 1 chart
- Save

**Change dashboard focus:**
- Click edit
- Uncheck old charts
- Check new charts
- Save

---

## Deleting Dashboards

### Delete Process

1. **Open Dashboard Manager**
2. **Find dashboard** to delete
3. **Click trash icon** (Delete button)
4. **Confirmation message** appears:
   - Asks "Are you sure you want to delete this dashboard?"
   - Shows two buttons: Cancel or Delete
5. **Confirm deletion:**
   - Click "Delete" to confirm
   - Dashboard removed immediately
   - Dashboard removed from dropdowns
6. **Cancel:**
   - Click "Cancel" to keep dashboard
   - Returns to normal list view

### Important Notes

- **Cannot delete default dashboard** while it's set as default
- **Must set new default first**, then delete
- **Deleted dashboards cannot be recovered**
- **No impact on other dashboards**

---

## Best Practices

### Naming Dashboards

✅ **Good names:**
- "Math Performance Overview"
- "Attendance Focus - Weekly"
- "Parent-Teacher Conference"
- "Administrative Dashboard"

❌ **Poor names:**
- "Dashboard 1"
- "Test"
- "Temp"
- "asdf"

### Organizing Your Dashboards

**By Subject:**
- "Mathematics"
- "Physics"
- "History"

**By Purpose:**
- "Performance Tracking"
- "Attendance Monitoring"
- "Conference Preparation"

**By Audience:**
- "Admin Overview"
- "Department Head"
- "Parent Communication"

### Using Descriptions

Write descriptions for dashboards you'll share or use long-term:

```
"Math 101 - Weekly Overview for parent conferences"
"Administrative summary for principal reports"
"Attendance tracking for students at risk"
```

---

## Chart Selection Guide

### For Performance Analysis
Select: Performance Chart + Scatter Plot + Box Plot + Treemap

### For Attendance Focus
Select: Attendance Chart + Trend Chart + Heatmap

### For Department Heads
Select: Performance Chart + Grade Distribution + Sankey Diagram + Treemap

### For Quick Status Check
Select: Performance Chart + Attendance Chart + Student Status (Pie)

### For Statistical Analysis
Select: Box Plot + Scatter Plot + Heatmap + Grade Distribution

### For Parent Meetings
Select: Performance Chart + Grade Distribution + Attendance Chart

---

## Troubleshooting

### Problem: "Name Already Exists"
**Cause:** You already have a dashboard with that name
**Solution:** Use a different name (names must be unique per user)

### Problem: "Please Select at Least One Chart"
**Cause:** No charts checked
**Solution:** Check at least one chart before saving

### Problem: Dashboard Not Appearing in Dropdown
**Cause:** 
- Recently created (refresh page)
- Deleted accidentally (check manager)
- Filter issue (clear filters)
**Solution:** 
1. Refresh page (F5)
2. Check Dashboard Manager
3. Clear any analytics filters

### Problem: Charts Not Filtering
**Cause:**
- Dashboard selector showing wrong selection
- Page needs refresh
**Solution:**
1. Check dashboard selector shows correct one
2. Refresh page (F5)
3. Select dashboard again

### Problem: Can't Edit or Delete
**Cause:** 
- Permission issue
- Network issue
**Solution:**
1. Refresh page
2. Check you're logged in
3. Try again
4. Contact administrator if persists

---

## Tips & Tricks

### Quick Dashboard Copy
To create a similar dashboard:
1. Create first dashboard
2. Click edit
3. Change name only
4. Save (creates copy with same charts)
5. Edit to add/remove charts as needed

### Cleanup Old Dashboards
Regularly review and delete unused dashboards to keep manager organized

### Seasonal Dashboards
Create different dashboards for different times:
- "Semester Review"
- "End of Year Analysis"
- "Beginning of Term"

### Testing New Charts
Create "Test" dashboard to try new chart combinations before committing

---

## Performance Considerations

**Fewer Charts = Faster Loading**
- Default (all 10 charts): Full load time
- Custom (3-4 charts): 50-70% faster
- Speed improvement noticeable on slower connections

**Battery Saving (Mobile)**
- Select fewer charts to reduce data usage
- Charts update in real-time (use custom dashboard)

---

## Privacy & Sharing

**Your Dashboards Are Private:**
- Only you can see your dashboards
- Not visible to other users
- Cannot share with colleagues (future enhancement)
- Safe for confidential analysis

---

## Keyboard Shortcuts (Coming Soon)

Future versions may include:
- `Ctrl+D` - Open Dashboard Manager
- `Ctrl+1-9` - Quick select dashboard 1-9
- `Esc` - Close dialogs

---

## FAQ

**Q: Can I share my dashboard with others?**
A: Not currently, but it's planned for Phase B. For now, share individual charts or export.

**Q: What happens if I delete my default dashboard?**
A: Set a different dashboard as default first, then delete.

**Q: Can I export a dashboard?**
A: Not directly, but you can export analytics (PDF/Excel) which respects your dashboard selection.

**Q: How many dashboards can I create?**
A: Unlimited (though keeping < 20 is recommended for usability).

**Q: Are dashboards backed up?**
A: Yes, they're stored in the database with automatic backups.

**Q: Can dashboards be password protected?**
A: Not needed - they're private to your account.

**Q: What if I change my mind about chart selection?**
A: Edit anytime - no limits on changes.

---

## Getting Help

- **In-App Help:** Hover over field labels for tooltips
- **Documentation:** See Analytics Guide
- **Email Support:** support@sms-system.edu
- **Admin:** Contact your system administrator

---

## Version Information

- **Feature Version:** Phase A
- **Released:** June 2026
- **Browser Support:** Chrome, Firefox, Safari, Edge (latest)
- **Mobile Support:** Full responsive design

---

**Last Updated:** June 9, 2026  
**Status:** Production Ready
