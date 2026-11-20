package cy.mieek.sms;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

/**
 * Saved sign-ins through Android's Credential Manager (the phone's password manager: Google
 * Password Manager, Samsung Pass, or whichever autofill service the owner chose).
 *
 * The sign-in page runs in a WebView and never reloads after a sign-in, so Android's own guess
 * that "a login just happened" (and its offer to save the password) is unreliable there. The web
 * app therefore says it explicitly: save() after a typed sign-in that the server accepted, get()
 * when the sign-in page opens, which shows the system's account sheet for a one-tap sign-in.
 *
 * Results never carry an error for the ordinary outcomes: {saved:false} or {found:false} with a
 * reason ("cancelled", "none", "unavailable") so the page simply goes on as a typed sign-in.
 */
@CapacitorPlugin(name = "SavedLogin")
public class SavedLoginPlugin extends Plugin {

    private CredentialManager manager() {
        return CredentialManager.create(getContext());
    }

    private Executor mainExecutor() {
        return ContextCompat.getMainExecutor(getContext());
    }

    @PluginMethod
    public void get(PluginCall call) {
        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(new GetPasswordOption())
                .build();
        try {
            manager().getCredentialAsync(
                    getActivity(),
                    request,
                    new CancellationSignal(),
                    mainExecutor(),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            Credential credential = response.getCredential();
                            JSObject result = new JSObject();
                            if (credential instanceof PasswordCredential) {
                                PasswordCredential password = (PasswordCredential) credential;
                                result.put("found", true);
                                result.put("id", password.getId());
                                result.put("password", password.getPassword());
                            } else {
                                result.put("found", false);
                                result.put("reason", "none");
                            }
                            call.resolve(result);
                        }

                        @Override
                        public void onError(GetCredentialException e) {
                            JSObject result = new JSObject();
                            result.put("found", false);
                            if (e instanceof GetCredentialCancellationException) {
                                result.put("reason", "cancelled");
                            } else if (e instanceof NoCredentialException) {
                                result.put("reason", "none");
                            } else {
                                result.put("reason", "unavailable");
                                result.put("detail", e.getType());
                            }
                            call.resolve(result);
                        }
                    });
        } catch (RuntimeException e) {
            JSObject result = new JSObject();
            result.put("found", false);
            result.put("reason", "unavailable");
            result.put("detail", e.getClass().getSimpleName());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void save(PluginCall call) {
        String id = call.getString("id");
        String password = call.getString("password");
        if (id == null || id.isEmpty() || password == null || password.isEmpty()) {
            call.reject("id and password are required");
            return;
        }
        try {
            manager().createCredentialAsync(
                    getActivity(),
                    new CreatePasswordRequest(id, password),
                    new CancellationSignal(),
                    mainExecutor(),
                    new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                        @Override
                        public void onResult(CreateCredentialResponse response) {
                            JSObject result = new JSObject();
                            result.put("saved", true);
                            call.resolve(result);
                        }

                        @Override
                        public void onError(CreateCredentialException e) {
                            JSObject result = new JSObject();
                            result.put("saved", false);
                            result.put("reason", e instanceof CreateCredentialCancellationException ? "cancelled" : "unavailable");
                            result.put("detail", e.getType());
                            call.resolve(result);
                        }
                    });
        } catch (RuntimeException e) {
            JSObject result = new JSObject();
            result.put("saved", false);
            result.put("reason", "unavailable");
            result.put("detail", e.getClass().getSimpleName());
            call.resolve(result);
        }
    }
}
