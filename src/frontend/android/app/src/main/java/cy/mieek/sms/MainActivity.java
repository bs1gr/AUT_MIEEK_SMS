package cy.mieek.sms;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Local plugin: the web app paints the system-bar strips in its own theme colours.
        // Must be registered before super.onCreate, which creates the bridge.
        registerPlugin(WindowChromePlugin.class);
        super.onCreate(savedInstanceState);
        // AFTER super.onCreate, never before: BridgeActivity.onCreate swaps the launch (splash)
        // theme for AppTheme.NoActionBar. EdgeToEdge.enable touches the window decor, so calling
        // it first built the window under the splash theme, whose android:background
        // (@drawable/splash) then stuck to the views and was drawn over the page header
        // (v1.18.62: faint "SMS — ΜΙΕΕΚ" covering the header and the language switch).
        // Capacitor's System Bars docs recommend it "inside BridgeActivity.onCreate".
        EdgeToEdge.enable(this);
    }
}
