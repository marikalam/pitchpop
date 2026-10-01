import ActivityKit
import Foundation

// The practice timer's Live Activity (Lock Screen, and the Dynamic Island
// on iPhones that have one). Shared by the app, which starts and updates
// it (PracticeActivityPlugin.swift), and the widget extension, which draws
// it (PracticeTimerWidget.swift).
@available(iOS 16.1, *)
struct PracticeActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        // While practicing, the timer counts up from here on its own (it's
        // "now minus the time practiced so far"), so the app doesn't need
        // to keep updating it in the background.
        var countingFrom: Date
        var paused: Bool
        // Shown while on a break.
        var minutes: Int
    }

    var playerName: String
}
