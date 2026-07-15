/* globals jQuery, window, document */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function($) {

    var methods = {
        options: {
            "optionClass": "",
            "dropdownClass": "",
            "autoinit": false,
            "callback": false,
            "lazyload": true,
            "filter": false,
            "onSelected": false,
            "destroy": function(element) {
                this.destroy(element);
            },
            "dynamicOptLabel": "Add a new option...",
            "optionIndex": 0
        },
        dropdownIndex: 0,
        init: function (options) {

            // Apply user options if user has defined some
            if (options) {
                options = $.extend(methods.options, options);
            } else {
                options = methods.options;
            }

            function initElement($select) {
                // Don't do anything if this is not a select or if this select was already initialized
                if ($select.data("dropdownjs") || !$select.is("select")) {
                    return;
                }

                // Is it a multi select?
                var multi = $select.prop("multiple"),
                    // Does it allow to create new options dynamically?
                    dynamicOptions = $select.attr("data-dynamic-opts"),
                    filterEnabled = options.filter,
                    $noResults = $(),
                    // Create the dropdown wrapper
                    $dropdown = $("<div></div>"),
                    // Label
                    $dropdownLabel = $select.attr("id") ? $("label[for='" + $select.attr("id") + "']") : null;

                if ($select.is("[data-filter]")) {
                    filterEnabled = String($select.attr("data-filter")).toLowerCase() !== "false";
                }

                $dropdown.addClass("dropdownjs").addClass(options.dropdownClass);
                $dropdown.data("select", $select);

                // Create the fake input used as "select" element and cache it as $input
                var $input = $("<input type=\"text\" readonly inputmode=\"none\" class=\"fakeinput\" aria-haspopup=\"listbox\" aria-label=\"Option\">");
                if ($dropdownLabel && $dropdownLabel.attr("id")) {
                    $input.attr("aria-labelledby='" + $dropdownLabel.attr("id") + "'");
                }
                if ($.material) { $input.data("mdproc", true); }
                // Append it to the dropdown wrapper
                $dropdown.append($input);

                // Create the UL that will be used as dropdown and cache it as $ul
                // Set translate to no as translations in select will propagate when elements are added	
                var $ul = $("<ul class=\"notranslate\" translate=\"no\" role=\"listbox\" tabindex=\"-1\" aria-label=\"Choose a value\"></ul>");
                $ul.data("select", $select);
                // Copy all aria attributes	
                $.each([].slice.call($select.get(0).attributes).filter(function (attr) {
                    return attr && attr.name && attr.name.indexOf("aria") === 0;
                }), function () {
                    $dropdown.attr(this.name, this.value);
                });
                if ($dropdownLabel && $dropdownLabel.attr("id")) {
                    $ul.attr("aria-labelledby='" + $dropdownLabel.attr("id") + "'");
                }

                // Append it to the dropdown	
                $dropdown.append($ul);

                if (filterEnabled) {
                    $noResults = $("<li class=\"dropdownjs-no-results\" role=\"status\">No results found</li>").hide();
                    $ul.append($noResults);
                }

                // Transfer the placeholder attribute
                $input.attr("placeholder", $select.attr("placeholder"));

                // Cache the dropdown options
                var selectOptions = $dropdown.find("li");

                // If is a single select, select the first one or the last with selected attribute
                if (!multi) {
                    var $selected;
                    if ($select.find(":selected").length) {
                        $selected = $select.find(":selected").last();
                    }
                    else {
                        $selected = $select.find("option, li").first();
                    }
                    methods._select($dropdown, $selected);
                } else {
                    var selectors = [], val = $select.val();
                    for (var i in val) {
                        selectors.push(val[i]);
                    }
                    if (selectors.length > 0) {
                        var $target = $dropdown.find(function () { return $.inArray($(this).data("value"), selectors) !== -1; });
                        $target.removeClass("selected");
                        methods._select($dropdown, $target);
                    }
                }

                // Transfer the classes of the select to the input dropdown
                $input.addClass($select[0].className);

                // Hide the old and ugly select
                $select.hide().attr("data-dropdownjs", true);

                // Bring to life our awesome dropdownjs
                $select.after($dropdown);

                if ($.material && !$input.val().trim()) {
                    setTimeout(function () {
                        $input.trigger("change");
                    }, 0);
                }

                // If lazyload is disabled, construct the dropdown options immediately
                if (!options.lazyload) {
                    initElementOptions($select);
                }

                // Call the callback
                if (options.callback) {
                    options.callback($dropdown);
                }

                //---------------------------------------//
                // DROPDOWN EVENTS                       //
                //---------------------------------------//
                var searchBuffer = "",
                    lastSearchTime = 0,
                    keyboardNavigated = false;

                function filterOptions(query) {
                    var normalizedQuery = query.trim().toLowerCase(),
                        $options = $ul.children("li[role=option]");

                    $options.each(function () {
                        var $option = $(this),
                            matchIndex = $option.text().trim().toLowerCase().indexOf(normalizedQuery);

                        $option.data("match-index", matchIndex);
                        $option.toggle(!normalizedQuery || matchIndex !== -1);
                    });

                    if (normalizedQuery) {
                        $($options.filter(":visible").get().sort(function (a, b) {
                            var $a = $(a),
                                $b = $(b);

                            return $a.data("match-index") - $b.data("match-index") ||
                                $a.data("option-index") - $b.data("option-index");
                        })).insertBefore($noResults);
                    } else {
                        $($options.get().sort(function (a, b) {
                            return $(a).data("option-index") - $(b).data("option-index");
                        })).insertBefore($noResults);
                    }

                    $noResults.toggle(Boolean(normalizedQuery) && !$options.filter(":visible").length);
                }

                function restoreFilterInput() {
                    if (!filterEnabled) {
                        return;
                    }

                    filterOptions("");
                    $input.attr("readonly", true);
                    $input.attr("inputmode", "none");
                    if (multi) {
                        var selectedText = [];
                        $dropdown.find("li[role=option].selected").each(function () {
                            selectedText.push($(this).text().trim());
                        });
                        $input.val(selectedText.join(", ")).trigger("change");
                    } else {
                        $input.val($dropdown.find("li[role=option].selected").last().text().trim()).trigger("change");
                    }
                }

                function closeDropdown() {
                    restoreFilterInput();
                    $ul.children("li[role=option]").removeClass("keyboard-focus");
                    $input.removeAttr("aria-activedescendant");
                    keyboardNavigated = false;
                    $input.removeClass("focus").blur();
                }

                function getVisibleOptions() {
                    return $ul.children("li[role=option]:visible:not(.disabled)");
                }

                function selectByDirection(direction) {
                    var $options = getVisibleOptions(),
                        activeEl = multi ? $options.filter(".keyboard-focus").last() : $dropdown.find(".selected:visible").last(),
                        activeIndex = $options.index(activeEl),
                        nextIndex,
                        $target;

                    if (!$options.length) {
                        return;
                    }

                    if (activeIndex === -1) {
                        nextIndex = direction > 0 ? 0 : $options.length - 1;
                    } else {
                        nextIndex = Math.max(0, Math.min($options.length - 1, activeIndex + direction));
                    }

                    $target = $options.eq(nextIndex);
                    keyboardNavigated = true;
                    if (multi) {
                        $options.removeClass("keyboard-focus");
                        $target.addClass("keyboard-focus");
                        $input.attr("aria-activedescendant", $target.attr("id"));
                    } else {
                        methods._select($dropdown, $target);
                    }
                    $ul.scrollTop($ul.scrollTop() + $target.position().top - ($ul.innerHeight() / 2));
                }

                if (filterEnabled) {
                    $input.on("input", function () {
                        if ($input.hasClass("focus")) {
                            filterOptions($(this).val());
                            keyboardNavigated = false;
                            $ul.children("li[role=option]").removeClass("keyboard-focus");
                            $input.removeAttr("aria-activedescendant");
                        }
                    });
                }

                // Handle keyboard navigation
                $input.on("keydown", function (e) {
                    var match = false,
                        isSpaceKey = e.which === 32 || e.key === " " || e.key === "Spacebar";
                    // Escape
                    if (e.which === 27) {
                        closeDropdown();
                        match = true;
                    }
                    // Up arrow
                    else if (e.which === 38) {
                        selectByDirection(-1);
                        match = true;
                    }
                    // Down arrow
                    else if (e.which === 40) {
                        selectByDirection(1);
                        match = true;
                    }
                    // Toggle the keyboard-focused option in a multi select
                    else if (multi && isSpaceKey && $input.hasClass("focus") && (getVisibleOptions().filter(".keyboard-focus").length || $input.is("[readonly]"))) {
                        var $focusedOption = getVisibleOptions().filter(".keyboard-focus").last();

                        if ($focusedOption.length) {
                            e.preventDefault();
                            methods._select($dropdown, $focusedOption);
                            $focusedOption.addClass("keyboard-focus");
                            $input.attr("aria-activedescendant", $focusedOption.attr("id"));
                            keyboardNavigated = true;
                            match = true;
                        } else if ($input.is("[readonly]")) {
                            e.preventDefault();
                            match = true;
                        }
                    }
                    // Enter
                    else if (e.which === 13) {
                        if (filterEnabled && $input.hasClass("focus") && $input.val().trim() && !keyboardNavigated) {
                            var $firstVisibleOption = getVisibleOptions().first();

                            if ($firstVisibleOption.length) {
                                methods._select($dropdown, $firstVisibleOption);
                            }
                        }
                        $select.change();
                        closeDropdown();
                        match = true;
                    }
                    // Type-to-select while the dropdown is open
                    else if (!filterEnabled && $input.hasClass("focus") && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        var key = e.key;

                        // Support browsers that do not provide KeyboardEvent.key
                        if (!key && e.which >= 32 && e.which <= 126) {
                            key = String.fromCharCode(e.which);
                        }

                        if (key && key.length === 1) {
                            var now = Date.now(),
                                normalizedKey = key.toLowerCase(),
                                repeatedKey = now - lastSearchTime <= 1000 && searchBuffer === normalizedKey,
                                searchOptions,
                                $target;

                            if (now - lastSearchTime > 1000 || repeatedKey) {
                                searchBuffer = normalizedKey;
                            } else {
                                searchBuffer += normalizedKey;
                            }
                            lastSearchTime = now;

                            searchOptions = $ul.children("li[role=option]:not(.disabled)").filter(function () {
                                return $(this).text().trim().toLowerCase().indexOf(searchBuffer) === 0;
                            });

                            if (searchOptions.length) {
                                if (repeatedKey) {
                                    var activeEl = multi ? searchOptions.filter(".keyboard-focus").last() : $dropdown.find(".selected");
                                    var selectedIndex = searchOptions.index(activeEl);
                                    $target = searchOptions.eq((selectedIndex + 1) % searchOptions.length);
                                } else {
                                    $target = searchOptions.first();
                                }

                                if (multi) {
                                    getVisibleOptions().removeClass("keyboard-focus");
                                    $target.addClass("keyboard-focus");
                                    $input.attr("aria-activedescendant", $target.attr("id"));
                                } else {
                                    methods._select($dropdown, $target);
                                }
                                $ul.scrollTop($ul.scrollTop() + $target.position().top - ($ul.innerHeight() / 2));
                            }

                            match = true;
                        }
                    }
                    if (match) {
                        return false;
                    }
                });
                // Hide after tab away, clicks on menu will also register blur against input
                // so we need to check to make sure the blur isn't caused by a sub li or ul
                $input.on("blur", function () {
                    // Use a timeout because blur will first focus body element before ul
                    setTimeout(function () {
                        var activeElement = document.activeElement,
                            ul = $ul.get(0);
                        if ($ul.is(":visible") && ul !== activeElement && !$.contains(ul, activeElement)) {
                            restoreFilterInput();
                            $ul.children("li[role=option]").removeClass("keyboard-focus");
                            $input.removeAttr("aria-activedescendant");
                            $input.removeClass("focus");
                        }
                    }, 100);
                });
                // On click, set the clicked one as selected
                $ul.on("mousedown", "li[role=option]", function (e) {
                    if (multi) {
                        e.preventDefault();
                    }
                });
                $ul.on("click", "li[role=option]", function (e) {
                    methods._select($dropdown, $(this));
                  
                    // trigger change event, if declared on the original selector
                    $select.change();
                });
                $ul.on("keydown", "li[role=option]", function (e) {
                    if (e.which === 27) {
                        $(".dropdownjs > ul > li").attr("tabindex", -1);
                        return $input.removeClass("focus").blur();
                    }
                    if (e.which === 32 && !$(e.target).is("input")) {
                        methods._select($dropdown, $(this));
                        return false;
                    }
                });

                $ul.on("focus", "li[role=option]", function () {
                    if ($select.is(":disabled")) {
                        return;
                    }
                    $input.addClass("focus");
                });

                // Add new options when the widget is used
                if (dynamicOptions && dynamicOptions.length) {
                    $ul.on("keydown", ".dropdownjs-add", function (e) {
                        if (e.which !== 13) return;
                        var $dynamicOption = $(this),
                            $option = $("<option>"),
                            val = $dynamicOption.find("input").val();
                        $dynamicOption.find("input").val("");

                        $option.attr("value", val);
                        $option.text(val);
                        $select.append($option);
                    });
                }

                // Listen for new added options and update dropdown if needed
                var addedNodesObserver = new MutationObserver(function (mutationList) {
                    return mutationList.filter(function (m) {
                        return m.type === "childList";
                    }).forEach(function (m) {
                        m.addedNodes.forEach(function (n) {
                            if (options.lazyload && !$select.data("loaded")) {
                                return;
                            }

                            var $this = $(n);

                            // Google translate may insert DOM nodes as <font>
                            if ($this.prop("tagName") !== "OPTION") {
                                $this = $this.closest("option");
                            }
                            var value = $this.val();
                            if (!value.length) return;

                            var existingOption = $ul.children().filter(function () { return $(this).data("value") === value; });
                            // Option already exists, likely subtree nodes were modified triggering this
                            if (existingOption.length) {
                                var existingIndex = $ul.children().index(existingOption),
                                    newIndex = $select.find("option").index($this);
                                // Option is in the incorrect order
                                if (newIndex >= 0 && existingIndex < newIndex) {
                                    existingOption.remove();
                                    methods._addOption($ul, $this);
                                    return;
                                }
                                existingOption.text($this.text());
                            }
                            else {
                                methods._addOption($ul, $this);
                            }
                        });

                        if (filterEnabled && m.addedNodes.length) {
                            filterOptions($input.val());
                        }
                    });
                });

                addedNodesObserver.observe($select[0], { childList: true, subtree: true });

                var removedNodesObserver = new MutationObserver(function (mutationList) {
                    return mutationList.filter(function (m) {
                        return m.type === "childList";
                    }).forEach(function (m) {
                        m.removedNodes.forEach(function (n) {
                            if (options.lazyload && !$select.data("loaded")) {
                                return;
                            }
                            setTimeout(function () {
                                var deletedValue = $(n).val(),
                                    existingOption = $select.children().filter(function () { return this.value === deletedValue; }),
                                    $selected;

                                // Option was not actually removed, likely subtree nodes were modified triggering this
                                if (existingOption.length) {
                                    methods._updateLiText($ul, deletedValue, existingOption.text());
                                }
                                else {
                                    $ul.children("li[role=option]").filter(function () {
                                        return $(this).data("value") === deletedValue;
                                    }).remove();
                                }

                                if ($select.find(":selected").length) {
                                    $selected = $select.find(":selected").last();
                                }
                                else {
                                    $selected = $select.find("option, li").first();
                                }
                                methods._select($dropdown, $selected);
                            }, 100);
                        });
                    });
                });

                removedNodesObserver.observe($select[0], { childList: true, subtree: true });

                // Update dropdown when using val, need to use .val("value").trigger("change");
                $select.on("change", function (e) {
                    if (!multi) {
                        var $selected;
                        if ($select.find(":selected").length) {
                            $selected = $select.find(":selected").last();
                        }
                        else {
                            $selected = $select.find("option, li").first();
                        }
                        methods._select($dropdown, $selected);
                    } else {
                        var target = $select.find(":selected"),
                            values = $(this).val();
                        // Unselect all options
                        selectOptions.removeClass("selected");
                        // Select options
                        target.each(function () {
                            var selected = selectOptions.filter(function () { return $.inArray($(this).data("value"), values) !== -1; });
                            selected.addClass("selected");
                        });
                    }
                });

                // Used to make the dropdown menu more dropdown-ish
                $input.on("click focus", function (e) {
                    e.stopPropagation();
                    if ($select.is(":disabled")) {
                        return;
                    }
                    var alreadyOpen = $(this).hasClass("focus");

                    if (options.lazyload) {
                        initElementOptions($select);
                    }

                    if (dynamicOptions && !alreadyOpen) {
                        $ul.find(".dropdownjs-add input").val("");
                    }

                    $(".dropdownjs > ul > li").attr("tabindex", -1);
                    $(".dropdownjs > input").not($(this)).removeClass("focus").blur();

                    // Set height of the dropdown
                    var coords = {
                        top: $(this).offset().top - $(document).scrollTop(),
                        left: $(this).offset().left - $(document).scrollLeft(),
                        bottom: $(window).height() - ($(this).offset().top - $(document).scrollTop()) - $(this).outerHeight(),
                        right: $(window).width() - ($(this).offset().left - $(document).scrollLeft())
                    },
                        height = coords.bottom;

                    // Decide if place the dropdown below or above the input
                    if (height < 200 && coords.top > coords.bottom) {
                        height = coords.top;
                        $ul.attr("placement", $("body").hasClass("rtl") ? "top-right" : "top-left");
                    } else {
                        $ul.attr("placement", $("body").hasClass("rtl") ? "bottom-right" : "bottom-left");
                    }

                    $(this).next("ul").css("max-height", height - 20);
                    $(this).addClass("focus");

                    if (filterEnabled && !alreadyOpen) {
                        $(this).removeAttr("readonly");
                        $(this).attr("inputmode", "search");
                        $(this).val("");
                        filterOptions("");
                        setTimeout(function () {
                            $input.focus();
                        }, 0);
                    }
                });
                // Close every dropdown on click outside
                $(document).on("click", function (e) {
                    // Don't close the multi dropdown if user is clicking inside it
                    if (multi && $(e.target).closest(".dropdownjs").length) return;

                    // Don't close the dropdown if user is clicking inside the dynamic-opts widget
                    if ($(e.target).parents(".dropdownjs-add").length || $(e.target).is(".dropdownjs-add")) return;

                    // Close opened dropdowns
                    $(".dropdownjs > ul > li").attr("tabindex", -1);
                    if ($(e.target).hasClass("disabled") || $(e.target).hasClass("dropdownjs")) {
                        return;
                    }
                    closeDropdown();
                });
            }

            function initElementOptions($select) {
                if (options.lazyload && $select.data("loaded")) {
                    return;
                }

                $select.data("loaded", true);

                var $dropdown = $select.nextAll(".dropdownjs").first(),
                    $ul = $dropdown.find("ul"),
                    $dynamicInput,
                    dynamicOptions = $select.attr("data-dynamic-opts");
                
                // Loop through options and transfer them to the dropdown menu
                $select.find("option").each(function () {
                    // Cache $(this)
                    var $this = $(this);
                    methods._addOption($ul, $this);
                });

                // If this select allows dynamic options add the widget
                if (dynamicOptions) {
                    $dynamicInput = $("<li class=dropdownjs-add></li>");
                    $dynamicInput.append("<input>");
                    $dynamicInput.find("input").attr("placeholder", options.dynamicOptLabel);
                    $ul.append($dynamicInput);
                }
            }

            if (options.autoinit) {
                var addedNodesObserver = new MutationObserver(function (mutationList) {
                    return mutationList.filter(function (m) {
                        return m.type === "childList";
                    }).forEach(function (m) {
                        m.addedNodes.forEach(function (n) {
                            var $this = $(n);
                            if (!$this.is("select")) {
                                $this = $this.find("select");
                            }
                            $this.each(function () {
                                if ($(this).is(options.autoinit)) {
                                    initElement($(this));
                                }
                            });
                        });
                    });
                });

                addedNodesObserver.observe(document, { childList: true, subtree: true });
            }

            // Loop through elements
            $(this).each(function () {
                initElement($(this));
            });
        },
        select: function (target) {
            var $target = $(this).find(function () { return $(this).data("value") === target; });
            methods._select($(this), $target);
        },
        _select: function ($dropdown, $target) {
            if ($target.is(".dropdownjs-add")) return;

            var $select = $dropdown.data("select"),
                $input = $dropdown.find("input.fakeinput"),
                // Is it a multi select?
                multi = $select.prop("multiple"),
                // Cache the dropdown options
                selectOptions = $dropdown.find("li");

            if ($target.hasClass("disabled")) {
                return;
            }

            if ($target.is("option")) {
                var targetValue = $target.val(),
                    $matchingOption = selectOptions.filter(function () {
                        return $(this).data("value") === targetValue;
                    }).last();

                if ($matchingOption.length) {
                    $target = $matchingOption;
                }
            }

            // Behavior for multiple select
            if (multi) {
                // Toggle option state
                $target.toggleClass("selected");
                // Toggle selection of the clicked option in native select
                $target.each(function () {
                    var value = $(this).prop("tagName") === "OPTION" ? $(this).val() : $(this).data("value"),
                        $selected = $select.find("option").filter(function () {
                            return $(this).val() === value;
                        });
                    $selected.prop("selected", $(this).hasClass("selected"));
                });
                if (!filterEnabled || $input.is("[readonly]")) {
                    // Add or remove the value from the input
                    var text = [];
                    selectOptions.each(function () {
                        if ($(this).hasClass("selected")) {
                            text.push($(this).text());
                        }
                    });
                    $input.val(text.join(", ")).trigger("change");
                    if ($.material) {
                        $select.add($input).toggleClass("empty", !$input.val().trim());
                    }
                }
            }

            // Behavior for single select
            if (!multi) {
                // Unselect options except the one that will be selected
                if ($target.is("li")) {
                    selectOptions.not($target).removeClass("selected");
                }
                // Select the selected option
                $target.addClass("selected");
                // Set the value to the input
                $input.val($target.text().trim());
                var value = $target.prop("tagName") === "OPTION" ? $target.val() : $target.data("value");
                // When val is set below on $select, it will fire change event,
                // which ends up back here, make sure to not end up in an infinite loop.
                // This is done last so text input is initialized on first load when condition is true.
                if (value === $select.val()) {
                    if ($.material) {
                        $select.add($input).toggleClass("empty", !$input.val().trim());
                    }
                    return;
                }
                // Set the value to the native select
                $select.val(value);
            }

            // This is used only if Material Design for Bootstrap is selected
            if ($.material) {
                if ($input.val().trim()) {
                    $select.add($input).removeClass("empty");
                } else {
                    $select.add($input).addClass("empty");
                }
            }

            // Call the callback
            if (this.options.onSelected) {
                this.options.onSelected($target.data("value"));
            }

        },
        _addOption: function ($ul, $this) {
            if ($ul.data("select").prop("multiple") && !$this.val()) {
                $this.prop("selected", false);
                return;
            }

            // Create the option
            var $option = $("<li id=\"dd-item-" + methods.dropdownIndex + "-" + methods.options.optionIndex++ + "\" role=\"option\"></li>");

            // Style the option
            $option.addClass(this.options.optionClass);

            // If the option has some text then transfer it
            if ($this.text()) {
                $option.text($this.text());
            }
            // Otherwise set the empty label and set it as an empty option
            else {
                $option.html("&nbsp;");
            }
            // Set the value of the option
            $option.data("value", $this.val());
            $option.data("option-index", $ul.data("select").find("option").index($this));

            // Will user be able to remove this option?
            if ($ul.data("select").attr("data-dynamic-opts") && $this.val()) {
                $option.append("<span class=close></span>");
                $option.find(".close").on("mousedown", function (e) {
                    e.preventDefault();
                });
                $option.find(".close").on("click", function (e) {
                    e.stopPropagation();
                    $option.remove();
                    $this.remove();
                });
            }

            // Is it selected?
            if ($this.prop("selected")) {
                $option.attr("selected", true);
                $option.addClass("selected");
            }

            if ($this.prop("disabled")) {
                $option.addClass("disabled").attr("aria-disabled", "true");
            }

            // Append option to our dropdown
            if ($ul.find(".dropdownjs-no-results").length) {
                $ul.find(".dropdownjs-no-results").before($option);
            } else if ($ul.find(".dropdownjs-add").length) {
                $ul.find(".dropdownjs-add").before($option);
            } else {
                $ul.append($option);
            }
        },
        _updateLiText: function ($ul, value, newText) {
            $ul.find("li").filter(function () { return $(this).data("value") === value; }).text(newText);
        },
        destroy: function ($e) {
            $($e).show().removeAttr('data-dropdownjs').nextAll(".dropdownjs").first().remove();
        }
    };

    $.fn.dropdown = function (params) {
        if (typeof methods[params] == 'function') methods[params](this);
        if (methods[params]) {
            return methods[params].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof params === "object" | !params) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + params + " does not exists on jQuery.dropdown");
        }
    };
}));
