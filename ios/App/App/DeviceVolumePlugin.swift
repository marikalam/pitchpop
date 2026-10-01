import AVFoundation
import Capacitor
import Foundation

// Tells the web app how loud the phone's volume is (0 to 1), and when it
// changes, so it can warn "Turn the volume up" (src/soundCheck.js). The
// ring/silent switch doesn't matter: PitchPop plays even on silent (see
// AppDelegate).
@objc(DeviceVolumePlugin)
public class DeviceVolumePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceVolumePlugin"
    public let jsName = "DeviceVolume"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVolume", returnType: CAPPluginReturnPromise),
    ]

    private var observation: NSKeyValueObservation?

    override public func load() {
        let session = AVAudioSession.sharedInstance()
        // The volume is only reported (and its changes observed) while the
        // audio session is active.
        try? session.setActive(true)
        observation = session.observe(\.outputVolume, options: [.new]) { [weak self] _, change in
            guard let volume = change.newValue else { return }
            self?.notifyListeners("change", data: ["volume": volume])
        }
    }

    @objc func getVolume(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(true)
        call.resolve(["volume": session.outputVolume])
    }
}
