import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Home } from "./Home";

describe("Home", () => {
  it("renders landing heading", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: /synk gives your team one place to track changes/i,
      }),
    ).toBeInTheDocument();
  });
});
