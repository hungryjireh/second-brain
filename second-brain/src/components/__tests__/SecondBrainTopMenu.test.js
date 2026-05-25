import { render, fireEvent } from "@testing-library/react-native";
import {
  SecondBrainHeaderBack,
  SecondBrainHeaderBrand,
  buildSecondBrainHeaderOptions,
} from "../SecondBrainTopMenu";

describe("SecondBrainTopMenu", () => {
  it("builds root header options without a back button", () => {
    const options = buildSecondBrainHeaderOptions({
      hideDate: false,
      isRootScreen: true,
    });

    expect(options.headerTitleAlign).toBe("center");
    expect(options.headerBackVisible).toBe(false);
    expect(options.headerLeft()).toBeNull();
    expect(options.headerRight).toEqual(expect.any(Function));
  });

  it("hides date renderer when hideDate is true", () => {
    const options = buildSecondBrainHeaderOptions({
      hideDate: true,
      isRootScreen: false,
      navigation: {},
    });

    expect(options.headerRight).toBeUndefined();
  });

  it("navigates back when back button is pressed and stack can go back", () => {
    const goBack = jest.fn();
    const navigate = jest.fn();
    const screen = render(
      <SecondBrainHeaderBack
        navigation={{
          canGoBack: () => true,
          goBack,
          navigate,
        }}
      />,
    );

    fireEvent.press(screen.getByLabelText("Back to Second Brain"));
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates to root screen when back button is pressed and cannot go back", () => {
    const goBack = jest.fn();
    const navigate = jest.fn();
    const screen = render(
      <SecondBrainHeaderBack
        navigation={{
          canGoBack: () => false,
          goBack,
          navigate,
        }}
      />,
    );

    fireEvent.press(screen.getByLabelText("Back to Second Brain"));
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("SecondBrain");
  });

  it("renders branded header title logo", () => {
    const screen = render(<SecondBrainHeaderBrand />);
    expect(screen.getByLabelText("Second Brain logo")).toBeTruthy();
  });
});
