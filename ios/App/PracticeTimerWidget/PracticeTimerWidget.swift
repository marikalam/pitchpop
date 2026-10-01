import ActivityKit
import SwiftUI
import WidgetKit

// The practice timer on the Lock Screen (and in the Dynamic Island on
// iPhones that have one), while a practice is on in PitchPop. Tapping it
// opens the app. The data comes from PracticeActivityAttributes.

@main
struct PracticeTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        PracticeTimerLiveActivity()
    }
}

private let pitchPopBlue = Color(red: 0.23, green: 0.44, blue: 0.94)
private let breakBrown = Color(red: 0.55, green: 0.33, blue: 0.16)

// Counts up by itself, e.g. "12:34" or "1:02:03".
private struct ElapsedText: View {
    let state: PracticeActivityAttributes.ContentState

    var body: some View {
        if state.paused {
            Text("\(state.minutes) min")
        } else {
            Text(timerInterval: state.countingFrom...Date.distantFuture, countsDown: false)
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<PracticeActivityAttributes>

    var body: some View {
        let state = context.state
        HStack(spacing: 14) {
            Text(state.paused ? "☕" : "🎹")
                .font(.system(size: 30))
                .frame(width: 52, height: 52)
                .background(Circle().fill((state.paused ? breakBrown : pitchPopBlue).opacity(0.15)))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(context.attributes.playerName.isEmpty ? "PitchPop" : context.attributes.playerName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            if context.isStale && !state.paused {
                Text("Open PitchPop")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(pitchPopBlue)
            } else {
                ElapsedText(state: state)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 130, alignment: .trailing)
                    .foregroundStyle(state.paused ? Color.secondary : pitchPopBlue)
            }
        }
        .padding(16)
    }

    private var title: String {
        if context.state.paused { return "On a break" }
        if context.isStale { return "Still practicing?" }
        return "Practicing"
    }
}

struct PracticeTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PracticeActivityAttributes.self) { context in
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.paused ? "☕ On a break" : "🎹 Practicing")
                        .font(.headline)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ElapsedText(state: context.state)
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 110, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.playerName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Text(context.state.paused ? "☕" : "🎹")
            } compactTrailing: {
                ElapsedText(state: context.state)
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 52)
            } minimal: {
                Text(context.state.paused ? "☕" : "🎹")
            }
        }
    }
}
