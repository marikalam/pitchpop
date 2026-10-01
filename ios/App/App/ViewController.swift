import UIKit
import WebKit
import Capacitor

// Capacitor's bridge script (native-bridge.js) asks the native side whether
// its optional CapacitorCookies and CapacitorHttp plugins are enabled by
// calling window.prompt() synchronously while the page loads. Starting with
// iOS 27, WebKit blanks a web view that shows a JavaScript dialog before its
// first paint - so the app launched to a permanently white screen.
//
// PitchPop enables neither plugin, so the answer is always "false". This
// script runs before Capacitor's (user scripts run in the order they're
// added, and the bridge adds its own only after this web view is created)
// and answers those two questions directly, so no prompt() ever reaches
// WebKit. Every other prompt() call passes through untouched. Once a
// Capacitor release stops using prompt() at startup, this can be removed.
//
// It also registers PitchPop's own native plugin (the practice timer's
// Lock Screen Live Activity, PracticeActivityPlugin.swift).
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PracticeActivityPlugin())
    }

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let source = """
        (function () {
          var nativePrompt = window.prompt;
          window.prompt = function (message, defaultValue) {
            try {
              var payload = JSON.parse(message);
              if (payload && (payload.type === 'CapacitorCookies.isEnabled' || payload.type === 'CapacitorHttp')) {
                return 'false';
              }
            } catch (e) {}
            return nativePrompt.call(window, message, defaultValue);
          };
        })();
        """
        let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        configuration.userContentController.addUserScript(script)
        return super.webView(with: frame, configuration: configuration)
    }
}
