import { useState, useRef, useEffect } from "react";
import "./SearchableDropdown.css";

const SearchableDropdown = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...",
  displayKey = "name",
  valueKey = "name"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const displayValue = option[displayKey] || option.name || option;
    return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get display text for selected value
  const getDisplayText = () => {
    if (!value) return "";
    const selected = options.find(
      (opt) => (opt[valueKey] || opt.name || opt) === value
    );
    return selected ? (selected[displayKey] || selected.name || selected) : value;
  };

  const handleSelect = (option) => {
    const optionValue = option[valueKey] || option.name || option;
    onChange(optionValue);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <div 
        className="searchable-dropdown-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          value={isOpen ? searchTerm : getDisplayText()}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
        />
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="searchable-dropdown-list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const displayValue = option[displayKey] || option.name || option;
              const optionValue = option[valueKey] || option.name || option;
              
              return (
                <div
                  key={index}
                  className={`searchable-dropdown-item ${
                    value === optionValue ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {displayValue}
                </div>
              );
            })
          ) : (
            <div className="searchable-dropdown-item no-results">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;