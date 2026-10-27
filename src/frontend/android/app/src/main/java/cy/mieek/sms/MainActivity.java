package cy.mieek.sms;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Local plugin: the web app paints the system-bar strips in its own theme colours.
        registerPlugin(WindowChromePlugin.class);
        // Capacitor 8's System Bars docs: call this when insetsHandling is not 'disable'
        // (Capacitor 9 will do it by default). It makes the bars transparent on every Android
        // version, so the padding Capacitor adds below them shows the window background
        // consistently instead of each OEM's bar colour; Android 15+ enforces this anyway.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
