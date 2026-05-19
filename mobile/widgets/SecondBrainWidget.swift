import ActivityKit
import SwiftUI
import WidgetKit

struct SecondBrainTimelineEntry: TimelineEntry {
  let date: Date
  let title: String
  let subtitle: String
}

struct SecondBrainTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> SecondBrainTimelineEntry {
    SecondBrainTimelineEntry(date: Date(), title: "Second Brain", subtitle: "Capture your next thought")
  }

  func getSnapshot(in context: Context, completion: @escaping (SecondBrainTimelineEntry) -> Void) {
    completion(SecondBrainTimelineEntry(date: Date(), title: "Second Brain", subtitle: "Capture your next thought"))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SecondBrainTimelineEntry>) -> Void) {
    let entry = SecondBrainTimelineEntry(date: Date(), title: "Second Brain", subtitle: "Open app to review entries")
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

struct SecondBrainWidgetEntryView: View {
  var entry: SecondBrainTimelineProvider.Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(entry.title)
        .font(.headline)
      Text(entry.subtitle)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(12)
  }
}

struct SecondBrainWidget: Widget {
  let kind: String = "SecondBrainWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SecondBrainTimelineProvider()) { entry in
      SecondBrainWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Second Brain")
    .description("Quick glance at your thought capture flow.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@available(iOSApplicationExtension 16.2, *)
struct SecondBrainLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SecondBrainActivityAttributes.self) { context in
      VStack(alignment: .leading, spacing: 6) {
        Text(context.state.title)
          .font(.headline)
        Text(context.state.subtitle)
          .font(.caption)
        ProgressView(value: Double(context.state.progress), total: 100)
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          VStack(alignment: .leading, spacing: 4) {
            Text(context.state.title)
              .font(.headline)
            Text(context.state.subtitle)
              .font(.caption)
          }
        }
      } compactLeading: {
        Text("SB")
      } compactTrailing: {
        Text("\(context.state.progress)%")
      } minimal: {
        Text("SB")
      }
    }
  }
}

@main
struct SecondBrainWidgetsBundle: WidgetBundle {
  var body: some Widget {
    SecondBrainWidget()

    if #available(iOSApplicationExtension 16.2, *) {
      SecondBrainLiveActivity()
    }
  }
}
