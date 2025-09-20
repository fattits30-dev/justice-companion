# PowerShell script to capture screenshot of Justice Companion

Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class ScreenCapture
{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int nFlags);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static void CaptureWindow(IntPtr handle, string filename)
    {
        RECT rect;
        GetWindowRect(handle, out rect);

        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;

        Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        Graphics graphics = Graphics.FromImage(bmp);
        IntPtr hdcBitmap = graphics.GetHdc();

        PrintWindow(handle, hdcBitmap, 0);

        graphics.ReleaseHdc(hdcBitmap);
        graphics.Dispose();

        bmp.Save(filename, ImageFormat.Png);
        bmp.Dispose();
    }

    public static void CaptureScreen(string filename)
    {
        int width = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Width;
        int height = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Height;

        Bitmap bmp = new Bitmap(width, height);
        Graphics g = Graphics.FromImage(bmp);
        g.CopyFromScreen(0, 0, 0, 0, new Size(width, height));
        bmp.Save(filename, ImageFormat.Png);
        g.Dispose();
        bmp.Dispose();
    }
}
"@ -ReferencedAssemblies System.Drawing, System.Windows.Forms

# Find Justice Companion window
$processes = Get-Process | Where-Object { $_.MainWindowTitle -like "*Justice*" -or $_.ProcessName -like "*electron*" }

if ($processes) {
    Write-Host "Found process: $($processes[0].ProcessName) - $($processes[0].MainWindowTitle)"

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $filename = ".\screenshots\justice-companion-$timestamp.png"

    # Create screenshots directory if it doesn't exist
    if (!(Test-Path ".\screenshots")) {
        New-Item -ItemType Directory -Path ".\screenshots" | Out-Null
    }

    # Try to capture the window
    try {
        [ScreenCapture]::CaptureWindow($processes[0].MainWindowHandle, $filename)
        Write-Host "✅ Window screenshot saved to: $filename"
    } catch {
        Write-Host "Window capture failed, trying full screen capture..."
        [ScreenCapture]::CaptureScreen($filename)
        Write-Host "✅ Screen screenshot saved to: $filename"
    }

    # Display file info
    $fileInfo = Get-Item $filename
    Write-Host "📊 File size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
    Write-Host "📏 Saved at: $($fileInfo.FullName)"
} else {
    Write-Host "❌ Could not find Justice Companion window"
    Write-Host "Capturing entire screen instead..."

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $filename = ".\screenshots\screen-$timestamp.png"

    if (!(Test-Path ".\screenshots")) {
        New-Item -ItemType Directory -Path ".\screenshots" | Out-Null
    }

    [ScreenCapture]::CaptureScreen($filename)
    Write-Host "✅ Full screen saved to: $filename"
}