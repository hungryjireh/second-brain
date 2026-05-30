import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import SecondBrainVoiceCaptureLayout from "../SecondBrainVoiceCaptureLayout";

describe("SecondBrainVoiceCaptureLayout", () => {
  it("renders header accessory below top row", () => {
    const view = render(
      <SecondBrainVoiceCaptureLayout
        insetsTop={0}
        screenTitle="Brainstorm talk"
        heading="Heading"
        description="Description"
        onBackPress={jest.fn()}
        headerAccessory={<Text>Accessory content</Text>}
      >
        <Text>Child content</Text>
      </SecondBrainVoiceCaptureLayout>,
    );

    expect(view.getByText("Accessory content")).toBeTruthy();
    expect(view.getByText("Child content")).toBeTruthy();
  });
});
