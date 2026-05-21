import { render } from "@testing-library/react-native";
import OpenBrainSectionedThoughtList from "../OpenBrainSectionedThoughtList";

describe("OpenBrainSectionedThoughtList", () => {
  it("renders section headers and delegates non-section rows", () => {
    const renderThoughtItem = jest.fn(({ item }) => item.id);
    const data = [
      { type: "section", key: "section-today", title: "Today" },
      { type: "thought", key: "thought-1", id: "t-1" },
      { type: "thought", key: "thought-2", id: "t-2" },
    ];

    const { getByText } = render(
      <OpenBrainSectionedThoughtList
        data={data}
        keyExtractor={(item) => item.key}
        renderThoughtItem={renderThoughtItem}
      />,
    );

    expect(getByText("Today")).toBeTruthy();
    expect(renderThoughtItem).toHaveBeenCalledTimes(2);
    expect(renderThoughtItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ item: data[1] }),
    );
    expect(renderThoughtItem).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ item: data[2] }),
    );
  });
});
