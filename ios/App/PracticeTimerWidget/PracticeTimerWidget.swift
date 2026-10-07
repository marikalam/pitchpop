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
        PitchPopPlayWidget()
        PitchPopPracticeWidget()
    }
}

private let pitchPopBlue = Color(red: 0.23, green: 0.44, blue: 0.94)
private let breakBrown = Color(red: 0.55, green: 0.33, blue: 0.16)

private let notePink = Color(red: 0.94, green: 0.44, blue: 0.60)
private let notePurple = Color(red: 0.61, green: 0.43, blue: 0.95)

// PitchPop's mark while practicing: piano keys with a music note popping
// up from them in the app's pink-to-blue colors. `keys` is the keys'
// color (white on the black Dynamic Island, blue on the Lock Screen).
private struct PianoNoteMark: View {
    var size: CGFloat
    var keys: Color

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Image(systemName: "pianokeys")
                .font(.system(size: size * 0.62, weight: .semibold))
                .foregroundStyle(keys)
                .frame(width: size, height: size, alignment: .bottomLeading)
            Image(systemName: "music.note")
                .font(.system(size: size * 0.58, weight: .heavy))
                .foregroundStyle(
                    LinearGradient(colors: [notePink, notePurple, pitchPopBlue], startPoint: .top, endPoint: .bottom)
                )
                .offset(x: size * 0.06, y: -size * 0.08)
        }
        .frame(width: size, height: size)
    }
}

// The Dynamic Island's small icon: the piano mark, or a coffee cup on a
// break.
private struct IslandMark: View {
    let state: PracticeActivityAttributes.ContentState
    var size: CGFloat = 22

    var body: some View {
        if state.paused {
            Text("☕")
        } else {
            PianoNoteMark(size: size, keys: .white)
        }
    }
}

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
            Group {
                if state.paused {
                    Text("☕").font(.system(size: 30))
                } else {
                    PianoNoteMark(size: 34, keys: pitchPopBlue)
                }
            }
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
                    HStack(spacing: 6) {
                        IslandMark(state: context.state, size: 24)
                        Text(context.state.paused ? "On a break" : "Practicing")
                            .font(.headline)
                    }
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
                IslandMark(state: context.state)
            } compactTrailing: {
                ElapsedText(state: context.state)
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 52)
            } minimal: {
                IslandMark(state: context.state, size: 20)
            }
        }
    }
}


// MARK: - Lock Screen widgets

// Small Lock Screen widgets (under the clock) that open PitchPop straight
// to the color game or to the practice timer, through the app's
// pitchpop://open/... link (appLink.js). They never change, so one entry
// is enough.
private struct LaunchEntry: TimelineEntry {
    let date: Date
}

private struct LaunchProvider: TimelineProvider {
    func placeholder(in context: Context) -> LaunchEntry {
        LaunchEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (LaunchEntry) -> Void) {
        completion(LaunchEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LaunchEntry>) -> Void) {
        completion(Timeline(entries: [LaunchEntry(date: Date())], policy: .never))
    }
}

private struct LaunchView: View {
    let title: String
    let subtitle: String
    let symbol: String
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 1) {
                    Image(systemName: symbol)
                        .font(.system(size: 17, weight: .bold))
                    Image(systemName: "pianokeys")
                        .font(.system(size: 12, weight: .semibold))
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: symbol)
                    .font(.system(size: 22, weight: .bold))
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.headline)
                    Text(subtitle)
                        .font(.caption)
                }
                Spacer(minLength: 0)
            }
        default:
            Label(title, systemImage: symbol)
        }
    }
}

private extension View {
    // iOS 17 and later want every widget to name its background.
    @ViewBuilder
    func lockScreenWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) { Color.clear }
        } else {
            self
        }
    }
}

struct PitchPopPlayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PitchPopPlay", provider: LaunchProvider()) { _ in
            LaunchView(title: "PitchPop", subtitle: "Pitch Practice", symbol: "music.note")
                .widgetURL(URL(string: "pitchpop://open/play"))
                .lockScreenWidgetBackground()
        }
        .configurationDisplayName("Pitch Practice")
        .description("Opens PitchPop's color game.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct PitchPopPracticeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PitchPopPractice", provider: LaunchProvider()) { _ in
            LaunchView(title: "Practice", subtitle: "PitchPop timer", symbol: "timer")
                .widgetURL(URL(string: "pitchpop://open/practice"))
                .lockScreenWidgetBackground()
        }
        .configurationDisplayName("Practice timer")
        .description("Opens PitchPop's Practice Mode.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
