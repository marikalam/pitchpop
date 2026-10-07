import ActivityKit
import SwiftUI
import WidgetKit

// The practice timer on the Lock Screen (and in the Dynamic Island on
// iPhones that have one), while a practice is on in PitchPop. Tapping it
// opens the app. The data comes from PracticeActivityAttributes.
//
// Also the PitchPop widget for the Home Screen and Lock Screen
// (OpenPitchPopWidget, at the bottom): a rainbow that opens the app.

@main
struct PracticeTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        PracticeTimerLiveActivity()
        OpenPitchPopWidget()
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

// MARK: - Home Screen widget

// Just a way into PitchPop: the app's rainbow and music note, and "Let's
// play!". Tapping anywhere on it opens the app (on its home page, where
// each child picks their name). It shows the same thing all the time, so
// it needs no data from the app.
private struct OpenEntry: TimelineEntry {
    let date: Date
}

private struct OpenProvider: TimelineProvider {
    func placeholder(in context: Context) -> OpenEntry { OpenEntry(date: Date()) }

    func getSnapshot(in context: Context, completion: @escaping (OpenEntry) -> Void) {
        completion(OpenEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OpenEntry>) -> Void) {
        completion(Timeline(entries: [OpenEntry(date: Date())], policy: .never))
    }
}

private let rainbowColors: [Color] = [
    Color(red: 0.90, green: 0.28, blue: 0.24),
    Color(red: 0.97, green: 0.64, blue: 0.31),
    Color(red: 0.96, green: 0.77, blue: 0.19),
    Color(red: 0.23, green: 0.70, blue: 0.45),
    Color(red: 0.23, green: 0.44, blue: 0.94),
    Color(red: 0.48, green: 0.31, blue: 0.84),
]

private let widgetCream = Color(red: 1.0, green: 0.98, blue: 0.94)

// Half-circle arcs, biggest (red) on the outside, with a music note above.
private struct RainbowMark: View {
    var size: CGFloat

    var body: some View {
        let band = size * 0.06
        ZStack(alignment: .bottom) {
            ForEach(0..<rainbowColors.count, id: \.self) { i in
                let diameter = size - CGFloat(i) * band * 2
                Circle()
                    .trim(from: 0.5, to: 1)
                    .stroke(rainbowColors[i], style: StrokeStyle(lineWidth: band, lineCap: .round))
                    .frame(width: diameter, height: diameter)
                    .offset(y: diameter / 2)
            }
            Image(systemName: "music.note")
                .font(.system(size: size * 0.26, weight: .heavy))
                .foregroundStyle(Color(red: 0.14, green: 0.16, blue: 0.30))
                .offset(y: -size * 0.02)
        }
        .frame(width: size, height: size / 2 + band, alignment: .bottom)
    }
}

private struct OpenPitchPopView: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "music.note")
                    .font(.system(size: 22, weight: .heavy))
            }
            .widgetAccentable()
        default:
            VStack(spacing: 8) {
                RainbowMark(size: 104)
                Text("Let\u{2019}s play!")
                    .font(.system(.headline, design: .rounded).weight(.bold))
                    .foregroundStyle(Color(red: 0.09, green: 0.10, blue: 0.17))
                Text("PitchPop")
                    .font(.system(.caption, design: .rounded).weight(.semibold))
                    .foregroundStyle(pitchPopBlue)
            }
        }
    }
}

struct OpenPitchPopWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OpenPitchPop", provider: OpenProvider()) { _ in
            if #available(iOSApplicationExtension 17.0, *) {
                OpenPitchPopView()
                    .containerBackground(for: .widget) { widgetCream }
            } else {
                OpenPitchPopView()
                    .padding()
                    .background(widgetCream)
            }
        }
        .configurationDisplayName("PitchPop")
        .description("Tap the rainbow to open PitchPop.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}
