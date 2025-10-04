# Complex Markdown Example

This fixture includes a wide variety of Markdown features to exercise the parser and renderer.

## Headers and inline styles

### Subheader with *emphasis* and **strong** text

Mixing inline `code` and links: [vite](https://vitejs.dev) and an email: <test@example.com>

---

## Lists

1. First ordered item
2. Second ordered item
   - Nested bullet A
     - Nested deeper 1
     - Nested deeper 2
   - Nested bullet B
3. Third ordered item with a footnote[^1]

[^1]: Footnotes are supported by some markdown-it plugins.

## Code blocks

```js
function hello(name) {
  // multi-line code with template literal
  return `Hello, ${name}!`;
}

console.log(hello('Mio'));
```

Indented code block:

    #!/usr/bin/env bash
    echo "hello world"

## Tables

| Name | Age | Notes |
| --- | ---: | --- |
| Alice | 30 | Loves **cats** |
| Bob | 27 | Uses `vim` |

## Blockquote with nested list

> This is a quote.
>
> - A bullet inside quote
> - Another one

## Inline HTML and comments

Here is an HTML snippet: <span class="badge">beta</span>

<!-- HTML comment should be ignored by markdown renderer -->

## Math (KaTeX style)

Inline math: $e^{i\pi} + 1 = 0$  

Display math:

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
$$

## Images and links

![Placeholder image](https://via.placeholder.com/150 "A placeholder")

## Complex nested HTML-like constructs

<details>
  <summary>Click to expand</summary>
  - Item A
  - Item B

  ```html
  <div>
    <p>Inner HTML block</p>
  </div>
  ```
</details>

---

End of complex fixture.
