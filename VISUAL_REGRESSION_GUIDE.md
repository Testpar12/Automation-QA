# Visual Regression Testing Guide

## Overview

The platform now includes comprehensive visual regression testing capabilities that allow you to:
1. **Compare screenshots** against baseline images from previous test runs
2. **Integrate with Figma** to compare live pages against design mockups
3. **Upload manual baselines** to validate against custom reference images

---

## Features

### ✅ **What's Included**

1. **Screenshot Comparison**
   - Pixel-by-pixel comparison using pixelmatch algorithm
   - Automatic image resizing and normalization
   - Configurable difference threshold (default: 0.1%)
   - Diff images generated showing exact differences

2. **Figma Integration**
   - Direct API integration with Figma
   - Auto-download design frames as baselines
   - Refresh baselines when designs update
   - Support for any Figma frame or component

3. **Manual Baseline Upload**
   - Upload custom reference images (PNG, JPG, etc.)
   - Support for design mockups from any source
   - Drag-and-drop interface

4. **Baseline Management**
   - Multiple baselines per page URL
   - Activate/deactivate baselines
   - Version control for design iterations
   - Viewport-specific baselines

5. **Visual Diff Reporting**
   - Difference percentage calculation
   - Pixel diff count
   - Pass/fail status based on threshold
   - Diff images highlighting changes
   - Integration with issue tracking

---

## How It Works

### Test Execution Flow

```
1. Test run starts
2. Pages discovered via sitemap/crawling
3. For each page:
   ├── Navigate and screenshot (current)
   ├── Find active baselines for page URL
   ├── For each baseline:
   │   ├── Load baseline image
   │   ├── Normalize images (resize if needed)
   │   ├── Compare pixel-by-pixel
   │   ├── Calculate difference %
   │   ├── Generate diff image (if failed)
   │   └── Save result to database
   └── Create issue if any baseline failed
4. Results displayed in run details
```

### Comparison Algorithm

Uses `pixelmatch` library for accurate visual comparison:
- **Antialiasing detection**: Ignores minor font rendering differences
- **Color difference**: Perceptual color distance (CIELAB)
- **Threshold**: 0.1 pixel difference required to mark as different
- **Output**: Diff image with differences highlighted in red

---

## Setup Guide

### 1. Create Baselines

You have three options for creating baselines:

#### Option A: From Screenshot (Automatic)
Baselines can be auto-created from test run screenshots via API:

```typescript
POST /api/baselines/screenshot
{
  "site_id": "site_id_here",
  "page_url": "https://example.com/page",
  "screenshot_path": "/path/to/screenshot.png",
  "viewport_width": 1440,
  "viewport_height": 900
}
```

#### Option B: Upload Manual Baseline
1. Navigate to site details page
2. Click "Manage Baselines"
3. Click "+ Create Baseline"
4. Select "Manual Upload"
5. Enter page URL
6. Set viewport dimensions
7. Upload image file
8. Click "Create Baseline"

#### Option C: From Figma Design
1. Navigate to site details page
2. Click "Manage Baselines"
3. Click "+ Create Baseline"
4. Select "Figma Design"
5. Enter page URL
6. Enter Figma file key (from URL)
7. Enter Figma node ID (frame/component)
8. Enter Figma access token
9. Set viewport dimensions
10. Click "Create Baseline"

**Getting Figma Details:**
- **File Key**: From Figma URL: `figma.com/file/FILE_KEY/...`
- **Node ID**: Right-click frame → Copy → Copy link → Extract ID from end of URL
- **Access Token**: Figma Settings → Account Settings → Personal Access Tokens → Generate new token

### 2. Run Tests

Once baselines are created:
1. Navigate to site details page
2. Click "Run Test"
3. Wait for test completion
4. View visual regression results in run details

### 3. Review Results

Visual regression results appear in run details page:

**Passed Baseline:**
```
✓ Passed - Baseline Comparison
Difference: 0.03% (1,234 pixels)
Threshold: 0.1%
```

**Failed Baseline:**
```
✗ Failed - Baseline Comparison  
Difference: 2.45% (123,456 pixels)
Threshold: 0.1%
[View Diff Image →]
```

Failed baselines also create an issue:
- **Type**: Visual
- **Title**: "Visual Regression: X Baseline(s) Failed on [Page]"
- **Severity**: Critical (>5%), Major (>1%), Minor (>0.1%)
- **Description**: Details of each failed baseline with diff percentages

---

## Baseline Management

### Activate/Deactivate Baselines

Only **active** baselines are used for comparison during test runs.

- **Activate**: Enables baseline for comparison
- **Deactivate**: Temporarily disables without deleting
- **Use case**: Keep old baselines for reference while using new ones

### Multiple Baselines per Page

You can have multiple active baselines for the same page URL:
- Desktop vs. mobile viewports
- Different design iterations
- Figma + screenshot comparison
- All active baselines are checked during tests

### Refresh Figma Baselines

When Figma designs change:
1. Go to Baselines page
2. Find the Figma baseline
3. Click "Refresh" (if implemented)
4. Or delete and recreate the baseline

---

## Configuration

### Difference Threshold

Default threshold: **0.1%** (0.001 ratio)

This means:
- < 0.1% difference = PASS
- ≥ 0.1% difference = FAIL

To adjust threshold, modify `VisualRegressionTester`:
```typescript
private readonly diffThreshold = 0.1; // Change to desired %
```

### Viewport Sizes

Baselines are viewport-specific. Common sizes:
- **Desktop**: 1440x900, 1920x1080
- **Tablet**: 768x1024, 1024x768
- **Mobile**: 375x667, 390x844, 360x800

### Pixelmatch Options

Current settings in `visualRegressionTester.ts`:
```typescript
pixelmatch(img1.data, img2.data, diff.data, width, height, {
  threshold: 0.1, // Pixel-level sensitivity
});
```

Options you can adjust:
- **threshold**: 0-1, higher = more tolerant to color differences
- **includeAA**: Consider antialiasing (default: true)
- **alpha**: Consider opacity (default: 0.1)

---

## API Endpoints

### Baseline Endpoints

```
GET    /api/sites/:siteId/baselines
POST   /api/baselines/screenshot
POST   /api/baselines/manual (multipart/form-data)
POST   /api/baselines/figma
POST   /api/figma/frames
POST   /api/baselines/:id/refresh
PATCH  /api/baselines/:id/activate
PATCH  /api/baselines/:id/deactivate
DELETE /api/baselines/:id
```

### Visual Diff Endpoints

```
GET    /api/runs/:runId/visual-diffs
```

---

## File Structure

### Backend Files

```
backend/src/
├── models/index.ts
│   ├── VisualBaseline model
│   └── VisualDiff model
├── services/
│   ├── visualRegressionTester.ts  # Screenshot comparison logic
│   ├── figmaIntegration.ts        # Figma API integration
│   ├── issueCreator.ts             # Creates visual regression issues
│   └── testRunner.ts               # Integrates visual regression
└── routes/
    └── baselines.ts                # Baseline API endpoints
```

### Frontend Files

```
frontend/src/
├── pages/
│   ├── BaselinesPage.tsx           # Baseline management UI
│   ├── RunDetailPage.tsx           # Shows visual diff results
│   └── SiteDetailPage.tsx          # Link to baselines
└── services/
    └── baselineService.ts          # Baseline API client
```

### Storage Directories

```
uploads/
├── screenshots/
│   └── {run_id}/
│       ├── {screenshot}.png        # Current screenshots
│       └── diffs/
│           └── diff-*.png          # Diff images
├── figma-baselines/
│   └── {file_key}-{node_id}.png   # Downloaded Figma designs
└── manual-baselines/
    └── baseline-*.png              # Uploaded reference images
```

---

## Workflow Examples

### Example 1: Validate Against Previous Run

**Goal**: Ensure new deployment didn't break UI

1. **First run** (establish baseline):
   ```
   - Run test
   - All pages screenshot
   - No baselines yet = no visual regression checks
   ```

2. **Create baselines from first run**:
   ```
   - Via API, mark run's screenshots as baselines
   - Or manually select best screenshots
   ```

3. **Second run** (after deployment):
   ```
   - Run test
   - Baselines found for each page
   - Comparison happens automatically
   - Issues created for differences > 0.1%
   ```

4. **Review results**:
   ```
   - Green check = UI unchanged
   - Red X = UI changed (review diff image)
   - Decide if change is intentional
   ```

### Example 2: Design-to-Implementation Validation

**Goal**: Ensure live site matches Figma designs

1. **Get Figma details**:
   ```
   - File key: abc123def456
   - Node ID: 123:456 (Homepage frame)
   - Access token: figd_xxxxx
   ```

2. **Create Figma baseline**:
   ```
   - Page URL: https://example.com/
   - Figma file key: abc123def456
   - Figma node ID: 123:456
   - Viewport: 1440x900
   ```

3. **Run test**:
   ```
   - Homepage screenshot captured
   - Figma design downloaded
   - Images compared
   - Difference: 3.2% (too high!)
   ```

4. **Review diff**:
   ```
   - View diff image
   - Identify discrepancies (colors, spacing, fonts)
   - Fix implementation
   - Re-run test until < 0.1% difference
   ```

### Example 3: Multiple Viewports

**Goal**: Test responsive design across devices

1. **Create baselines for each viewport**:
   ```
   Desktop:  /homepage, 1440x900, Figma/screenshot
   Tablet:   /homepage, 768x1024, Figma/screenshot  
   Mobile:   /homepage, 375x667, Figma/screenshot
   ```

2. **Run test**:
   ```
   - Desktop screenshot compared to desktop baseline
   - Mobile testing also creates mobile screenshots
   - But baselines are viewport-specific
   - Need separate test runs or multi-viewport testing
   ```

3. **Current limitation**:
   ```
   - Test runs use single viewport (1440x900)
   - Mobile testing creates separate screenshots
   - For multi-viewport baselines, run multiple tests
     or extend test runner to test multiple viewports
   ```

---

## Troubleshooting

### Issue: Baselines always failing

**Possible causes:**
1. **Different viewport**: Baseline created at 1920x1080 but tests run at 1440x900
2. **Dynamic content**: Timestamps, ads, user-specific data changes every run
3. **Font rendering**: Different OS/browser renders fonts slightly differently
4. **Animation timing**: Captured screenshot mid-animation

**Solutions:**
- Ensure matching viewport dimensions
- Exclude dynamic regions (future feature)
- Use same OS/browser for baseline and test
- Add delays before screenshot to let animations complete

### Issue: Figma download fails

**Possible causes:**
1. **Invalid access token**: Expired or wrong token
2. **Wrong file key**: Copied incorrectly from URL
3. **Wrong node ID**: Frame deleted or ID changed
4. **Permission denied**: Token doesn't have access to file

**Solutions:**
- Generate new Figma access token
- Double-check file key from Figma URL
- Verify frame still exists in Figma
- Ensure token has access to the file

### Issue: Diff images not showing

**Possible causes:**
1. **File path issue**: Diff saved to wrong location
2. **Permission error**: Can't write to uploads directory
3. **Frontend path mapping**: Incorrect URL generation

**Solutions:**
- Check `uploads/screenshots/{run_id}/diffs/` directory exists
- Verify write permissions on uploads directory
- Check browser console for 404 errors
- Verify backend serving `/uploads` static files

---

## Future Enhancements

### Planned Features

1. **Region-based comparison**
   - Exclude dynamic areas (ads, timestamps)
   - Focus on specific UI components
   - Ignore specific elements by selector

2. **Multi-viewport testing**
   - Single run tests multiple viewports
   - Desktop, tablet, mobile in one test
   - Automatic responsive baseline matching

3. **Baseline auto-approval**
   - Mark visual diffs as "approved"
   - Auto-create new baseline from approved diff
   - Workflow for design updates

4. **Historical comparison**
   - Compare against any previous run
   - Visual timeline of UI changes
   - Diff heatmaps showing change frequency

5. **Smart diffing**
   - Ignore minor font antialiasing differences
   - Color tolerance configuration
   - Layout shift detection separate from color changes

6. **Batch baseline creation**
   - Create baselines for all pages at once
   - Import baselines from design system
   - Bulk Figma import by page

---

## Best Practices

### 1. Baseline Strategy

**Do:**
- Create baselines from stable, approved designs
- Use Figma baselines for design validation
- Use screenshot baselines for regression testing
- Keep baselines updated with intentional design changes

**Don't:**
- Create baselines from buggy pages
- Mix development and production baselines
- Leave old baselines active when design changes
- Ignore failed visual diffs without review

### 2. Viewport Management

**Do:**
- Create separate baselines for each target viewport
- Test most common user viewports first
- Document which viewport each baseline represents
- Use standard viewport sizes (375, 768, 1440)

**Don't:**
- Compare different viewport sizes
- Create baselines at random viewport sizes
- Test only desktop when users are mobile-first

### 3. Handling Changes

**Do:**
- Review every failed visual diff
- Update baselines when design intentionally changes
- Document why baselines were updated
- Keep old baselines (deactivated) for reference

**Don't:**
- Automatically approve all visual diffs
- Delete old baselines immediately
- Ignore small differences (they compound)
- Update baselines without reviewing changes

### 4. Figma Integration

**Do:**
- Use descriptive frame names in Figma
- Organize Figma files by feature/page
- Refresh baselines when designs update
- Store access tokens securely (environment variables)

**Don't:**
- Hardcode Figma tokens in code
- Use personal Figma files for production baselines
- Forget to update baselines when Figma changes
- Share access tokens

---

## Technical Details

### Comparison Algorithm

```typescript
// Pixel-by-pixel comparison
const pixelDiffCount = pixelmatch(
  baselineImageData,  // PNG pixel array
  currentImageData,   // PNG pixel array
  diffImageData,      // Output diff array
  width,              // Image width
  height,             // Image height
  { threshold: 0.1 }  // Sensitivity
);

// Calculate percentage
const totalPixels = width * height;
const differencePercentage = (pixelDiffCount / totalPixels) * 100;

// Pass/fail
const passed = differencePercentage <= 0.1; // 0.1% threshold
```

### Image Normalization

When comparing images of different sizes:

```typescript
// Resize both to match larger dimensions
const targetWidth = Math.max(img1.width, img2.width);
const targetHeight = Math.max(img1.height, img2.height);

// Use sharp library for high-quality resize
await sharp(imageBuffer)
  .resize(targetWidth, targetHeight, {
    fit: 'contain',  // Don't crop, add whitespace
    background: { r: 255, g: 255, b: 255, alpha: 1 }  // White bg
  })
  .png()
  .toBuffer();
```

### Diff Image Generation

Diff images show:
- **Red pixels**: Differences detected
- **Gray pixels**: Matching areas
- **Brightness**: Degree of difference

---

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Check MongoDB: `VisualBaseline` and `VisualDiff` collections
- Review uploaded files: `uploads/figma-baselines/`, `uploads/manual-baselines/`
- Check screenshot diffs: `uploads/screenshots/{run_id}/diffs/`

---

**Last Updated**: November 25, 2025  
**Version**: MVP1 with Visual Regression Testing
