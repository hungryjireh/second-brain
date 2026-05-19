import ActivityKit

struct SecondBrainActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var subtitle: String
    var progress: Int
  }

  var entryId: String
}
