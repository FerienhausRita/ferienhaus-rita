declare namespace JSX {
  interface IntrinsicElements {
    "contwise-maps": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        apikey?: string;
        language?: string;
        resourceids?: string;
        rendermode?: string;
        themecolor?: string;
        showsheet?: string;
        reduceddetailsheet?: string;
      },
      HTMLElement
    >;
  }
}
