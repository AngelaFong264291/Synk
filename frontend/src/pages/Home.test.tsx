import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Home } from "./Home";

describe("Home", () => {
  it("renders heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /home/i })).toBeInTheDocument();
  });
});
