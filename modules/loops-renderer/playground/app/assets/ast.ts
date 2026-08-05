import type { LoopsLmxAst } from "@onderwijsin/loops-core";

export const data: LoopsLmxAst = {
  type: "root",
  children: [
    {
      type: "element",
      name: "Style",
      attributes: {
        themeId: "cms91kkt70f0e0j0q6pua7fxs"
      },
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Component",
      attributes: {
        componentId: "cms91sxip00000jzqlzur2j3z",
        paddingTop: "4",
        paddingBottom: "4"
      },
      children: [
        {
          type: "element",
          name: "Image",
          attributes: {
            src: "https://images.vialoops.com/cms91k6me0f1v0i2ofhygfa4x/cms91qval0f1g0j2xh67v0uxe.png",
            alt: "Logo van Trainees in onderwijs",
            href: "https://traineesinonderwijs.nl",
            width: "90"
          },
          children: []
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Hoi {contact.firstName},"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "H1",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Heading 1"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "H2",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Heading 2"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "H3",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Heading 3"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Quote",
      attributes: {
        fontSize: "16"
      },
      children: [
        {
          type: "text",
          value: "A quoted message with "
        },
        {
          type: "element",
          name: "Em",
          attributes: {},
          children: [
            {
              type: "text",
              value: "italic emphasis"
            }
          ]
        },
        {
          type: "text",
          value: "."
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Een reguliere paragraaf. Of met markup: "
        },
        {
          type: "element",
          name: "Strong",
          attributes: {},
          children: [
            {
              type: "text",
              value: "bold"
            }
          ]
        },
        {
          type: "text",
          value: ", "
        },
        {
          type: "element",
          name: "Em",
          attributes: {},
          children: [
            {
              type: "text",
              value: "italic"
            }
          ]
        },
        {
          type: "text",
          value: ", "
        },
        {
          type: "element",
          name: "Underline",
          attributes: {},
          children: [
            {
              type: "text",
              value: "underline"
            }
          ]
        },
        {
          type: "text",
          value: ", "
        },
        {
          type: "element",
          name: "Code",
          attributes: {},
          children: [
            {
              type: "text",
              value: "code"
            }
          ]
        },
        {
          type: "text",
          value: ", "
        },
        {
          type: "element",
          name: "Em",
          attributes: {},
          children: [
            {
              type: "element",
              name: "Strong",
              attributes: {},
              children: [
                {
                  type: "text",
                  value: "bold italic"
                }
              ]
            }
          ]
        },
        {
          type: "text",
          value: "."
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [
        {
          type: "element",
          name: "Text",
          attributes: {
            textColor: "#475569"
          },
          children: [
            {
              type: "text",
              value: "Normal inline text"
            }
          ]
        },
        {
          type: "text",
          value: " and "
        },
        {
          type: "element",
          name: "Strike",
          attributes: {},
          children: [
            {
              type: "text",
              value: "struck-through text"
            }
          ]
        },
        {
          type: "element",
          name: "Br",
          attributes: {},
          children: []
        },
        {
          type: "text",
          value: "Text after a line break."
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Paragraaf met "
        },
        {
          type: "element",
          name: "Link",
          attributes: {
            href: "https://example.com"
          },
          children: [
            {
              type: "element",
              name: "Underline",
              attributes: {},
              children: [
                {
                  type: "text",
                  value: "link"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {
        blockColor: "#c2c2c2",
        blockBorderRadius: "6",
        paddingTop: "8",
        paddingRight: "10",
        paddingBottom: "8",
        paddingLeft: "10"
      },
      children: [
        {
          type: "text",
          value: "Paragraaf met styling (background, padding, radius)."
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {
        lineHeight: "250"
      },
      children: [
        {
          type: "element",
          name: "Text",
          attributes: {
            textColor: "#ff0000"
          },
          children: [
            {
              type: "text",
              value: "Paragraaf met andere text kleur en line height"
            }
          ]
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "UnorderedList",
      attributes: {},
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ListItem",
          attributes: {},
          children: [
            {
              type: "text",
              value: "bullet list"
            }
          ]
        },
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ListItem",
          attributes: {},
          children: []
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "OrderedList",
      attributes: {},
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ListItem",
          attributes: {},
          children: [
            {
              type: "text",
              value: "Numbered list"
            }
          ]
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "OrderedList",
      attributes: {},
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ListItem",
          attributes: {},
          children: []
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "CodeBlock",
      attributes: {},
      children: [
        {
          type: "text",
          value: "Code block"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {
        align: "center"
      },
      children: [
        {
          type: "text",
          value: "Text center"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {
        align: "right"
      },
      children: [
        {
          type: "text",
          value: "Text right"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Button",
      attributes: {
        href: "https://example.com"
      },
      children: [
        {
          type: "text",
          value: "A button"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Button",
      attributes: {
        href: "https://example.com?utm_source={contact.userId}"
      },
      children: [
        {
          type: "text",
          value: "A button with conditional value"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Divider",
      attributes: {
        width: "100"
      },
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Icons",
      attributes: {
        gap: "16",
        size: "32"
      },
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "Icon",
          attributes: {
            name: "square-facebook",
            href: "https://facebook.com"
          },
          children: []
        },
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "Icon",
          attributes: {
            name: "square-x-twitter",
            href: "x.com"
          },
          children: []
        },
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "Icon",
          attributes: {
            name: "linkedin",
            href: "linkedin.com"
          },
          children: []
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Columns",
      attributes: {},
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ColumnItem",
          attributes: {},
          children: [
            {
              type: "text",
              value: "\n    "
            },
            {
              type: "element",
              name: "Paragraph",
              attributes: {},
              children: [
                {
                  type: "text",
                  value: "Equal"
                }
              ]
            },
            {
              type: "text",
              value: "\n  "
            }
          ]
        },
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ColumnItem",
          attributes: {},
          children: [
            {
              type: "text",
              value: "\n    "
            },
            {
              type: "element",
              name: "Paragraph",
              attributes: {},
              children: [
                {
                  type: "text",
                  value: "columns"
                }
              ]
            },
            {
              type: "text",
              value: "\n  "
            }
          ]
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Columns",
      attributes: {
        gap: "122",
        widths: "37,63"
      },
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ColumnItem",
          attributes: {},
          children: [
            {
              type: "text",
              value: "\n    "
            },
            {
              type: "element",
              name: "Paragraph",
              attributes: {},
              children: [
                {
                  type: "text",
                  value: "Custom size"
                }
              ]
            },
            {
              type: "text",
              value: "\n  "
            }
          ]
        },
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "ColumnItem",
          attributes: {},
          children: [
            {
              type: "text",
              value: "\n    "
            },
            {
              type: "element",
              name: "Paragraph",
              attributes: {},
              children: [
                {
                  type: "text",
                  value: "Columns"
                }
              ]
            },
            {
              type: "text",
              value: "\n  "
            }
          ]
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: []
    },
    {
      type: "text",
      value: "\n"
    },
    {
      type: "element",
      name: "Section",
      attributes: {},
      children: [
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "Paragraph",
          attributes: {},
          children: [
            {
              type: "text",
              value: "A section"
            }
          ]
        },
        {
          type: "text",
          value: "\n  "
        },
        {
          type: "element",
          name: "Button",
          attributes: {
            href: "https://example.com"
          },
          children: [
            {
              type: "text",
              value: "With a button"
            }
          ]
        },
        {
          type: "text",
          value: "\n"
        }
      ]
    },
    {
      type: "element",
      name: "Section",
      attributes: {
        if: "{contact.firstName}",
        ifOperation: "equal",
        ifValue: "Jane"
      },
      children: [
        {
          type: "element",
          name: "Paragraph",
          attributes: {},
          children: [
            {
              type: "text",
              value: "This text only renders because contact.firstName is Jane"
            }
          ]
        }
      ]
    }
  ]
};
