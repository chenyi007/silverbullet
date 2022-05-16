import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FilterOption } from "@silverbulletmd/common/types";
import fuzzysort from "fuzzysort";

function magicSorter(a: FilterOption, b: FilterOption): number {
  if (a.orderId && b.orderId) {
    return a.orderId < b.orderId ? -1 : 1;
  }
  if (a.orderId) {
    return -1;
  }
  if (b.orderId) {
    return 1;
  }
  return 0;
}

type FilterResult = FilterOption & {
  result?: any;
};

function simpleFilter(
  pattern: string,
  options: FilterOption[]
): FilterOption[] {
  const lowerPattern = pattern.toLowerCase();
  return options.filter((option) => {
    return option.name.toLowerCase().includes(lowerPattern);
  });
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fuzzySorter(pattern: string, options: FilterOption[]): FilterResult[] {
  return fuzzysort
    .go(pattern, options, {
      all: true,
      key: "name",
    })
    .map((result) => ({ ...result.obj, result: result }))
    .sort(magicSorter);
}

export function FilterList({
  placeholder,
  options,
  label,
  onSelect,
  onKeyPress,
  allowNew = false,
  helpText = "",
  completePrefix,
  icon,
  newHint,
}: {
  placeholder: string;
  options: FilterOption[];
  label: string;
  onKeyPress?: (key: string, currentText: string) => void;
  onSelect: (option: FilterOption | undefined) => void;
  allowNew?: boolean;
  completePrefix?: string;
  helpText: string;
  newHint?: string;
  icon?: IconDefinition;
}) {
  const searchBoxRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [matchingOptions, setMatchingOptions] = useState(
    fuzzySorter("", options)
  );
  const [selectedOption, setSelectionOption] = useState(0);

  let selectedElementRef = useRef<HTMLDivElement>(null);

  function filterUpdate(e: React.ChangeEvent<HTMLInputElement>) {
    updateFilter(e.target.value);
  }

  function updateFilter(originalPhrase: string) {
    let foundExactMatch = false;
    let results = fuzzySorter(originalPhrase, options);
    if (allowNew && !foundExactMatch) {
      results.push({
        name: originalPhrase,
        hint: newHint,
      });
    }
    setMatchingOptions(results);

    setText(originalPhrase);
    setSelectionOption(0);
  }

  useEffect(() => {
    updateFilter(text);
  }, [options]);

  useEffect(() => {
    searchBoxRef.current!.focus();
  }, []);

  useEffect(() => {
    function closer() {
      onSelect(undefined);
    }

    document.addEventListener("click", closer);

    return () => {
      document.removeEventListener("click", closer);
    };
  }, []);

  const returnEl = (
    <div className="filter-box">
      <div className="header">
        <label>{label}</label>
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          ref={searchBoxRef}
          onChange={filterUpdate}
          onKeyDown={(e: React.KeyboardEvent) => {
            // console.log("Key up", e);
            if (onKeyPress) {
              onKeyPress(e.key, text);
            }
            switch (e.key) {
              case "ArrowUp":
                setSelectionOption(Math.max(0, selectedOption - 1));
                break;
              case "ArrowDown":
                setSelectionOption(
                  Math.min(matchingOptions.length - 1, selectedOption + 1)
                );
                break;
              case "Enter":
                onSelect(matchingOptions[selectedOption]);
                e.preventDefault();
                break;
              case "Escape":
                onSelect(undefined);
                break;
              case " ":
                if (completePrefix && !text) {
                  updateFilter(completePrefix);
                  e.preventDefault();
                }
                break;
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div
        className="help-text"
        dangerouslySetInnerHTML={{ __html: helpText }}
      ></div>
      <div className="result-list">
        {matchingOptions && matchingOptions.length > 0
          ? matchingOptions.map((option, idx) => (
              <div
                key={"" + idx}
                ref={selectedOption === idx ? selectedElementRef : undefined}
                className={
                  selectedOption === idx ? "selected-option" : "option"
                }
                onMouseOver={(e) => {
                  setSelectionOption(idx);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(option);
                }}
              >
                <span className="icon">
                  {icon && <FontAwesomeIcon icon={icon} />}
                </span>
                <span
                  className="name"
                  dangerouslySetInnerHTML={{
                    __html: option?.result?.indexes
                      ? fuzzysort.highlight(option.result, "<b>", "</b>")!
                      : escapeHtml(option.name),
                  }}
                ></span>
                {option.hint && <span className="hint">{option.hint}</span>}
              </div>
            ))
          : null}
      </div>
    </div>
  );

  useEffect(() => {
    selectedElementRef.current?.scrollIntoView({
      block: "nearest",
    });
  });

  return returnEl;
}
