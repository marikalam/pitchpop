import AVFoundation
import AVKit
import Capacitor
import Foundation

// Tells the web app how loud the phone's volume is (0 to 1), and when it
// changes, so it can warn "Turn the volume up" (src/soundCheck.js). The
// ring/silent switch doesn't matter: PitchPop plays even on silent (see
// AppDelegate).
//
// It also says where the sound is going (the phone, headphones, a Bluetooth
// speaker or the car) and can open iOS's own "play on" menu, so a family in
// the car can send PitchPop to the iPhone's speaker with one tap. (An app
// that only plays sound can't pick the speaker by itself; only apps that
// use the microphone can.)
@objc(DeviceVolumePlugin)
public class DeviceVolumePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceVolumePlugin"
    public let jsName = "DeviceVolume"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOutput", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickOutput", returnType: CAPPluginReturnPromise),
    ]

    private var observation: NSKeyValueObservation?
    private var picker: AVRoutePickerView?

    override public func load() {
        let session = AVAudioSession.sharedInstance()
        // The volume is only reported (and its changes observed) while the
        // audio session is active.
        try? session.setActive(true)
        observation = session.observe(\.outputVolume, options: [.new]) { [weak self] _, change in
            guard let volume = change.newValue else { return }
            self?.notifyListeners("change", data: ["volume": volume])
        }
        NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self = self else { return }
            self.notifyListeners("output", data: self.output())
        }
    }

    private func output() -> [String: Any] {
        let port = AVAudioSession.sharedInstance().currentRoute.outputs.first
        let type = port?.portType
        let kind: String
        if type == .carAudio {
            kind = "car"
        } else if type == .bluetoothA2DP || type == .bluetoothHFP || type == .bluetoothLE {
            kind = "bluetooth"
        } else if type == .airPlay {
            kind = "airplay"
        } else if type == .builtInSpeaker || type == .builtInReceiver {
            kind = "phone"
        } else if type == .headphones || type == .usbAudio {
            kind = "headphones"
        } else {
            kind = "other"
        }
        return ["kind": kind, "name": port?.portName ?? ""]
    }

    @objc func getOutput(_ call: CAPPluginCall) {
        call.resolve(output())
    }

    // Opens the menu Control Center shows for "play on" (iPhone, the car,
    // AirPods...) by tapping an invisible AVRoutePickerView's button.
    @objc func pickOutput(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let view = self.bridge?.viewController?.view else {
                call.reject("No view")
                return
            }
            if self.picker == nil {
                let picker = AVRoutePickerView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
                picker.alpha = 0.01
                picker.isUserInteractionEnabled = false
                view.addSubview(picker)
                self.picker = picker
            }
            func button(in v: UIView) -> UIButton? {
                if let b = v as? UIButton { return b }
                for sub in v.subviews { if let b = button(in: sub) { return b } }
                return nil
            }
            guard let picker = self.picker, let b = button(in: picker) else {
                call.reject("No picker")
                return
            }
            b.sendActions(for: .touchUpInside)
            call.resolve()
        }
    }

    @objc func getVolume(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(true)
        call.resolve(["volume": session.outputVolume])
    }
}
