package cy.mieek.sms;

import android.content.res.Configuration;
import android.graphics.Color;
import android.view.View;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the web app colour the strips Capacitor leaves below the status and navigation bars.
 *
 * Capacitor's SystemBars plugin pads the *decor view* under the system bars (no viewport-fit=cover,
 * plan todo 36), so the strips show the decor view's background. Two things fight the app over
 * that colour: the theme's windowBackground follows the device night mode, and
 * SystemBars.setStyle() resets the decor background to it on every call, including the two it
 * makes itself on every configuration change. With targetSdk 36 Android enforces edge-to-edge and
 * the core plugins expose no bar colour API, so this plugin repaints the decor view (and the
 * WebView) and re-applies the last colour after configuration changes.
 *
 * Only setBackgroundColor() is used on the decor view, never a new window drawable: DecorView
 * resets its padding when it is given a new background drawable, which would wipe the inset
 * padding SystemBars applied.
 */
@CapacitorPlugin(name = "WindowChrome")
public class WindowChromePlugin extends Plugin {

    private Integer lastColor;

    @PluginMethod
    public void setBackgroundColor(PluginCall call) {
        String hex = call.getString("color");
        if (hex == null) {
            call.reject("color is required");
            return;
        }
        final int color;
        try {
            color = Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            call.reject("invalid color: " + hex);
            return;
        }
        lastColor = color;
        getActivity().runOnUiThread(() -> {
            apply(color);
            call.resolve();
        });
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        if (lastColor == null) {
            return;
        }
        final int color = lastColor;
        // Posted so it runs after SystemBars' own handler has reset the decor background.
        getActivity().getWindow().getDecorView().post(() -> apply(color));
    }

    private void apply(int color) {
        View decor = getActivity().getWindow().getDecorView();
        decor.setBackgroundColor(color);
        getBridge().getWebView().setBackgroundColor(color);
        // Make SystemBars re-apply its inset padding in case the background change disturbed it.
        decor.requestApplyInsets();
    }
}
