import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainBackButton from "../SecondBrainBackButton";

describe("SecondBrainBackButton", () => {
  it("renders with the default accessibility label", () => {
    const view = render(<SecondBrainBackButton onPress={jest.fn()} />);

    expect(view.getByLabelText("Back")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const view = render(<SecondBrainBackButton onPress={onPress} />);

    fireEvent.press(view.getByLabelText("Back"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses a custom accessibility label", () => {
    const view = render(
      <SecondBrainBackButton
        onPress={jest.fn()}
        accessibilityLabel="Back to Second Brain"
      />,
    );

    expect(view.getByLabelText("Back to Second Brain")).toBeTruthy();
  });
});
