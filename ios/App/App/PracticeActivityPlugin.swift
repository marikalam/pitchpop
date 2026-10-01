import ActivityKit
import Capacitor
import Foundation

// Lets the web app show the practice timer as a Live Activity on the Lock
// Screen (see src/liveActivity.js). update() starts it or changes it; end()
// removes it. Does nothing on iOS before 16.2 or when the family has turned
// Live Activities off for PitchPop in Settings.
@objc(PracticeActivityPlugin)
public class PracticeActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PracticeActivityPlugin"
    public let jsName = "PracticeActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        let playerName = call.getString("playerName") ?? ""
        let elapsedMs = call.getDouble("elapsedMs") ?? 0
        let paused = call.getBool("paused") ?? false
        // When nobody has tapped for a long while the app pauses the timer
        // the next time it opens; from then on the Lock Screen shows it as
        // stale ("Still practicing?") instead of counting on.
        let staleAtMs = call.getDouble("staleAtMs")
        let state = PracticeActivityAttributes.ContentState(
            countingFrom: Date().addingTimeInterval(-elapsedMs / 1000),
            paused: paused,
            minutes: Int(elapsedMs / 60000)
        )
        let staleDate = staleAtMs.map { Date(timeIntervalSince1970: $0 / 1000) }
        let content = ActivityContent(state: state, staleDate: paused ? nil : staleDate)

        Task {
            let running = Activity<PracticeActivityAttributes>.activities
            if let current = running.first, playerName.isEmpty || current.attributes.playerName == playerName {
                await current.update(content)
            } else {
                for activity in running {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                if ActivityAuthorizationInfo().areActivitiesEnabled {
                    do {
                        _ = try Activity.request(
                            attributes: PracticeActivityAttributes(playerName: playerName),
                            content: content,
                            pushType: nil
                        )
                    } catch {
                        print("PitchPop: could not start the practice Live Activity: \(error)")
                    }
                }
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<PracticeActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
