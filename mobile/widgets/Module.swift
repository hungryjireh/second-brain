import ActivityKit
import ExpoModulesCore

public class ReactNativeWidgetExtensionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeWidgetExtension")

    Function("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }

      return false
    }

    Function("startActivity") { (entryId: String, title: String, subtitle: String, progress: Int) -> Void in
      if #available(iOS 16.2, *) {
        let attributes = SecondBrainActivityAttributes(entryId: entryId)
        let state = SecondBrainActivityAttributes.ContentState(
          title: title,
          subtitle: subtitle,
          progress: progress
        )
        let content = ActivityContent(state: state, staleDate: nil)

        do {
          _ = try Activity<SecondBrainActivityAttributes>.request(
            attributes: attributes,
            content: content,
            pushType: nil
          )
        } catch {}
      }
    }

    Function("updateActivity") { (title: String, subtitle: String, progress: Int) -> Void in
      if #available(iOS 16.2, *) {
        let state = SecondBrainActivityAttributes.ContentState(
          title: title,
          subtitle: subtitle,
          progress: progress
        )
        let content = ActivityContent(state: state, staleDate: nil)

        Task {
          for activity in Activity<SecondBrainActivityAttributes>.activities {
            await activity.update(content)
          }
        }
      }
    }

    Function("endActivity") { () -> Void in
      if #available(iOS 16.2, *) {
        Task {
          for activity in Activity<SecondBrainActivityAttributes>.activities {
            await activity.end(dismissalPolicy: .immediate)
          }
        }
      }
    }
  }
}
