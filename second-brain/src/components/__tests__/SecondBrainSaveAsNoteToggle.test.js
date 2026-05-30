import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainSaveAsNoteToggle from "../SecondBrainSaveAsNoteToggle";

describe("SecondBrainSaveAsNoteToggle", () => {
  it("renders label and reflects enabled value", () => {
    const view = render(
      <SecondBrainSaveAsNoteToggle value onValueChange={jest.fn()} />,
    );

    expect(view.getByText("Save as Note")).toBeTruthy();
    expect(view.getByLabelText("Save as Note").props.value).toBe(true);
  });

  it("calls onValueChange when toggled", () => {
    const onValueChange = jest.fn();
    const view = render(
      <SecondBrainSaveAsNoteToggle value onValueChange={onValueChange} />,
    );

    fireEvent(view.getByLabelText("Save as Note"), "valueChange", false);

    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
