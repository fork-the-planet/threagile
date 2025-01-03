class EditorGenerator {
    constructor(object, schema, formContainer, title, customEnumFields = {}) {
        this.object = object;
        this.schema = schema;
        this.formContainer = formContainer;
        this.title = title;
        this.customEnumFields = customEnumFields;
    }

    generateEditor(ignoreFields = [], extendableProperties = {}, callback = (key, value, oldValue) => {}) {
        this.formContainer.empty();
        if (this.title) {
            const title = $('<label>')
                        .text(this.title)
                        .addClass('property-editor-title')
            this.formContainer.append(title);
        }
        for (const [key, property] of Object.entries(this.schema)) {
            if (ignoreFields.includes(key)) {
                continue;
            }

            const label = $('<label>')
                .text(key)
                .addClass('property-editor-label');
            const value = this.object[key];
            let input;
            const propertyType = Array.isArray(property.type) ? property.type[0] : property.type;

            switch (propertyType) {
                case 'string':
                    if (property.format === 'date') {
                        let oldValue = this.object[key] || '';
                        input = $('<input type="text">')
                            .addClass('property-editor-input')
                            .val(oldValue)
                            .on('change', () => {
                                const newValue = input.val();
                                this.object[key] = newValue;
                                callback(key, newValue, oldValue);
                                oldValue = newValue;
                            });
                        input.datepicker({
                            dateFormat: "yy-mm-dd" // ISO 8601 format
                        });
                    } else if (property.enum) {
                        let oldValue = this.object[key] || property.enum[0];
                        input = $('<select>')
                            .addClass('property-editor-input')
                            .on('change', () => {
                                const newValue = input.val();
                                this.object[key] = newValue;
                                callback(key, newValue, oldValue);
                                oldValue = newValue;
                            });

                        property.enum.forEach((option) => {
                            const optionElement = $('<option>')
                                .val(option)
                                .text(option);

                            // Set the 'selected' attribute if the option matches the current value
                            if (this.object[key] === option) {
                                optionElement.prop('selected', true);
                            }

                            input.append(optionElement);
                        });
                    } else if (this.customEnumFields[key]) {
                        let oldValue = this.object[key] || this.customEnumFields[key][0];
                        input = $('<select>')
                            .addClass('property-editor-input')
                            .on('change', () => {
                                const newValue = input.val();
                                this.object[key] = newValue;
                                callback(key, newValue, oldValue);
                                oldValue = newValue;
                            });

                        this.customEnumFields[key].forEach((option) => {
                            input.append($('<option>').val(option).text(option).prop('selected', value === option));
                        });
                    } else {
                        let oldValue = this.object[key] || '';
                        input = $('<input type="text">')
                            .addClass('property-editor-input')
                            .val(oldValue)
                            .on('change', () => {
                                const newValue = input.val();
                                this.object[key] = newValue;
                                callback(key, newValue, oldValue);
                                oldValue = newValue;
                            });
                    }
                    break;

                case 'integer':
                case 'number': {
                    let oldValue = this.object[key] !== undefined ? this.object[key] : '0';
                    input = $('<input type="number">')
                        .addClass('property-editor-input')
                        .val(oldValue)
                        .attr('min', property.minimum || null)
                        .attr('max', property.maximum || null)
                        .on('input', () => {
                            const newValue = input.val();
                            this.object[key] = parseFloat(newValue);
                            callback(key, newValue, oldValue);
                            oldValue = newValue;
                        });
                    break;
                    }
                case 'boolean':
                    let oldValue = this.object[key] !== undefined ? this.object[key] : '0';
                    input = $('<input type="checkbox">')
                        .addClass('property-editor-checkbox')
                        .prop('checked', this.object[key] || false)
                        .on('change', () => {
                            const newValue = input.is(':checked');
                            this.object[key] = input.is(':checked');
                            callback(key, newValue, oldValue);
                            oldValue = newValue;
                        });
                    break;

                case 'object': {
                    const subContainer = $('<div>').addClass('property-editor-object').hide();
                    const toggleButton = $('<span>')
                        .text('>')
                        .addClass('property-editor-toggle')
                        .on('click', () => {
                            subContainer.toggle();
                            toggleButton.text(toggleButton.text() === '>' ? 'v' : '>');
                        });

                    if (this.object[key] === undefined) {
                        this.object[key] = {};
                    }
                    const subObject = this.object[key] || {};
                    const subSchema = property.properties || {};

                    if (extendableProperties[key]) {
                        const extendableContainer = $('<div>').addClass('property-editor-extendable');
                        const addEntryCaption = extendableProperties[key].addCaption ? extendableProperties[key].addCaption : 'Add entry'
                        const addButton = $('<button>')
                            .text(addEntryCaption)
                            .on('click', () => {
                                const newKey = prompt('Enter key for the new entry:');
                                if (!newKey) return;

                                if (property.additionalProperties?.type === 'object') {
                                    subObject[newKey] = {};

                                    const nestedProperties = property.additionalProperties.properties || {};
                                    for (const [nestedKey, nestedProperty] of Object.entries(nestedProperties)) {
                                        if (nestedProperty.enum) {
                                            subObject[newKey][nestedKey] = nestedProperty.enum[0]; // Initialize with first enum value
                                        }
                                    }
                                } else {
                                    subObject[newKey] = '';
                                }
                                renderExtendableEntries();
                                callback(key, newKey, undefined);
                            });

                        const renderExtendableEntries = () => {
                            extendableContainer.empty();

                            for (const [entryKey, entryValue] of Object.entries(subObject)) {
                                const entryContainer = $('<div>').addClass('extendable-entry');

                                // Key input
                                let oldKey = entryKey;
                                const keyInput = $('<input type="text">')
                                    .addClass('property-editor-input')
                                    .val(oldKey)
                                    .on('change', () => {
                                        const newKey = keyInput.val();
                                        if (newKey !== entryKey) {
                                            delete subObject[entryKey];
                                            subObject[newKey] = entryValue;
                                        }
                                        renderExtendableEntries();
                                        callback(key, newKey, oldKey);
                                        oldKey = newKey;
                                    });

                                // Value editor
                                let valueEditor;
                                if (property.additionalProperties?.type === 'object') {
                                    const entrySubEditor = new EditorGenerator(
                                        entryValue,
                                        property.additionalProperties.properties || {},
                                        $('<div>'),
                                        '',
                                        this.customEnumFields
                                    );
                                    entrySubEditor.generateEditor(ignoreFields, extendableProperties, callback);
                                    valueEditor = entrySubEditor.formContainer;
                                } else {
                                    let oldValue = entryValue || '';
                                    valueEditor = $('<input type="text">')
                                        .addClass('property-editor-input')
                                        .val(oldValue)
                                        .on('change', () => {
                                            let newValue = valueEditor.val();
                                            subObject[entryKey] = newValue;
                                            callback(entryKey, newValue, oldValue);
                                        });
                                }

                                const deleteButton = $('<button>')
                                    .text('x')
                                    .on('click', () => {
                                        delete subObject[entryKey];
                                        renderExtendableEntries();
                                        callback(entryKey, 'DELETED', undefined);
                                    });

                                entryContainer.append(keyInput, valueEditor, deleteButton);

                                const delimiter = $('<br /> <br />');
                                extendableContainer.append(entryContainer, delimiter);
                            }
                        };

                        renderExtendableEntries();
                        input = $('<div>')
                            .append(toggleButton, label, extendableContainer, addButton);

                    } else {
                        const subEditor = new EditorGenerator(subObject, subSchema, '', '', this.customEnumFields);
                        subEditor.formContainer = subContainer; // Set the container manually
                        subEditor.generateEditor(ignoreFields, extendableProperties, callback);
                        this.object[key] = subObject;

                        input = $('<div>')
                            .append(toggleButton, label, subContainer);
                    }
                    break;
                }

                case 'array': {
                    const arrayContainer = $('<div>').addClass('property-editor-array');
                    const arrayItems = this.object[key] || [];
                    const itemSchema = property.items || { type: 'string' }; // Default to strings if items schema is missing
                    const customEnum = this.customEnumFields[key];

                    const renderArrayItems = () => {
                        arrayContainer.empty();

                        arrayItems.forEach((item, index) => {
                            const itemContainer = $('<div>').addClass('array-item');
                            const deleteButton = $('<button>')
                                .text('x')
                                .addClass('array-item-delete')
                                .on('click', () => {
                                    arrayItems.splice(index, 1);
                                    renderArrayItems();
                                    callback(key + '[' + index + ']', 'DELETED', item);
                                });

                            if (itemSchema.enum) {
                                const select = $('<select>')
                                    .addClass('property-editor-input')
                                    .on('change', () => {
                                        arrayItems[index] = select.val();
                                        callback(key + '[' + index + ']', select.val());
                                    });

                                itemSchema.enum.forEach((option) => {
                                    const optionElement = $('<option>')
                                        .val(option)
                                        .text(option)
                                        .prop('selected', item === option);
                                    select.append(optionElement);
                                });

                                itemContainer.append(select);
                            } else if (this.customEnumFields[key]) {
                                const select = $('<select>')
                                    .addClass('property-editor-input')
                                    .on('change', () => {
                                        arrayItems[index] = select.val();
                                        callback(key + '[' + index + ']', select.val());
                                    });

                                this.customEnumFields[key].forEach((option) => {
                                    const optionElement = $('<option>')
                                        .val(option)
                                        .text(option)
                                        .prop('selected', item === option);
                                    select.append(optionElement);
                                });

                                itemContainer.append(select);
                            }
                            else if (itemSchema.type === 'string') {
                                let oldValue = item || '';
                                const input = $('<input type="text">')
                                    .addClass('property-editor-input')
                                    .val(oldValue)
                                    .on('change', () => {
                                        const newValue = input.val();
                                        arrayItems[index] = newValue;
                                        callback(key + '[' + index + ']', newValue, oldValue);
                                        oldValue = newValue;
                                    });
                                itemContainer.append(input);
                            } else if (itemSchema.type === 'number' || itemSchema.type === 'integer') {
                                let oldValue = item !== undefined ? item : '0';
                                const input = $('<input type="number">')
                                    .addClass('property-editor-input')
                                    .val(oldValue)
                                    .on('input', () => {
                                        const newValue = input.val();
                                        arrayItems[index] = parseFloat(newValue);
                                        callback(key + '[' + index + ']', newValue, oldValue);
                                    });
                                itemContainer.append(input);
                            } else if (itemSchema.type === 'object' || itemSchema.properties) {
                                // Handle array of objects
                                const subEditor = new EditorGenerator(arrayItems[index], itemSchema.properties, '', '', this.customEnumFields);
                                subEditor.formContainer = itemContainer; // Set the container manually
                                subEditor.generateEditor(ignoreFields, extendableProperties, callback);
                            } else {
                                // Fallback for unsupported item types
                                itemContainer.append(
                                    $('<label>')
                                        .text('Unsupported item type: ' + (itemSchema.type || 'unknown'))
                                        .addClass('property-editor-label')
                                );
                            }

                            itemContainer.append(deleteButton);
                            arrayContainer.append(itemContainer);
                        });
                    };

                    const addButton = $('<button>')
                        .text('Add')
                        .on('click', () => {
                            if (itemSchema.enum) {
                                arrayItems.push(itemSchema.enum[0]); // Default to the first enum value
                            } else if (itemSchema.type === 'object') {
                                arrayItems.push({});
                            } else if (itemSchema.type === 'string') {
                                const defaultValue = customEnum && customEnum.length > 0 ? customEnum[0] : '';
                                arrayItems.push(defaultValue);
                            } else if (itemSchema.type === 'number' || itemSchema.type === 'integer') {
                                arrayItems.push(0); // Default value for numbers
                            } else {
                                console.warn('Unsupported item type for addition:', itemSchema.type);
                                return;
                            }
                            renderArrayItems();
                            callback(key, 'added');
                        });

                    renderArrayItems();
                    input = $('<div>')
                        .append(arrayContainer, addButton);

                    this.object[key] = arrayItems;
                    break;
                }

                default:
                    input = $('<label>')
                        .text('Unsupported type ' + propertyType)
                        .addClass('property-editor-label');
            }

            const fieldContainer = $('<div>').addClass('property-editor-field');
            fieldContainer.append(label).append(input);
            this.formContainer.append(fieldContainer);
        }
    }

    generateEditorForKeys(objectKey, addCaption, callback = (key, value, oldValue) => {}) {
        this.formContainer.empty();
        if (this.title) {
            const title = $('<label>')
                        .text(this.title)
                        .addClass('property-editor-title')
            this.formContainer.append(title);
        }
        for (const [key, property] of Object.entries(this.schema)) {
            if (key !== objectKey) {
                continue;
            }

            let input;
            const subObject = this.object[key] || {};
            const extendableContainer = $('<div>').addClass('property-editor-extendable');
            const addButton = $('<button>')
                .text(addCaption)
                .on('click', () => {
                    const newKey = prompt('Enter key for the new entry:');
                    if (!newKey) {
                        return;
                    }
                    subObject[newKey] = {};
                    const nestedProperties = property.additionalProperties.properties || {};
                    for (const [nestedKey, nestedProperty] of Object.entries(nestedProperties)) {
                        if (nestedProperty.enum) {
                            subObject[newKey][nestedKey] = nestedProperty.enum[0]; // Initialize with first enum value
                        }
                    }


                    renderExtendableEntries();
                    callback(key, newKey, undefined);
                });

            const renderExtendableEntries = () => {
                extendableContainer.empty();

                for (const [entryKey, entryValue] of Object.entries(subObject)) {
                    const entryContainer = $('<div>').addClass('extendable-entry');

                    // Key input
                    let oldKey = entryKey;
                    const keyInput = $('<input type="text">')
                        .addClass('property-editor-input')
                        .val(oldKey)
                        .on('change', () => {
                            const newKey = keyInput.val();
                            if (newKey !== entryKey) {
                                delete subObject[entryKey];
                                subObject[newKey] = entryValue;
                            }
                            renderExtendableEntries();
                            callback(key, newKey, oldKey);
                            oldKey = newKey;
                        });

                    const deleteButton = $('<button>')
                        .text('x')
                        .on('click', () => {
                            delete subObject[entryKey];
                            renderExtendableEntries();
                            callback(entryKey, 'DELETED', entryKey);
                        });

                    entryContainer.append(keyInput, deleteButton);
                    extendableContainer.append(entryContainer);
                }
            };

            renderExtendableEntries();
            input = $('<div>')
                .append(extendableContainer, addButton);

            const fieldContainer = $('<div>').addClass('property-editor-field');
            fieldContainer.append(input);
            this.formContainer.append(fieldContainer);
        }
    }

    generateEditorForObject(objectKey, addCaption, callback = (key, value, oldValue) => {}) {
        this.formContainer.empty();
        if (this.title) {
            const title = $('<label>')
                        .text(this.title)
                        .addClass('property-editor-title')
            this.formContainer.append(title);
        }
        for (const [key, property] of Object.entries(this.schema)) {
            if (key !== objectKey) {
                continue;
            }

            let input;
            const subObject = this.object[key] || {};
            const extendableContainer = $('<div>').addClass('property-editor-extendable');
            const addButton = $('<button>')
                .text(addCaption)
                .on('click', () => {
                    const newKey = prompt('Enter key for the new entry:');
                    if (!newKey) return;

                    if (property.additionalProperties?.type === 'object') {
                        subObject[newKey] = {};

                        const nestedProperties = property.additionalProperties.properties || {};
                        for (const [nestedKey, nestedProperty] of Object.entries(nestedProperties)) {
                            if (nestedProperty.enum) {
                                subObject[newKey][nestedKey] = nestedProperty.enum[0]; // Initialize with first enum value
                            }
                        }
                    } else {
                        subObject[newKey] = '';
                    }
                    renderExtendableEntries();
                    callback(key, newKey, undefined);
                });

            let customEnumFields = this.customEnumFields;
            const renderExtendableEntries = () => {
                extendableContainer.empty();

                for (const [entryKey, entryValue] of Object.entries(subObject)) {
                    const entryContainer = $('<div>').addClass('extendable-entry');

                    let oldKey = entryKey;
                    const keyInput = $('<input type="text">')
                        .addClass('property-editor-input')
                        .val(entryKey)
                        .on('change', () => {
                            const newKey = keyInput.val();
                            if (newKey !== entryKey) {
                                delete subObject[entryKey];
                                subObject[newKey] = entryValue;
                            }
                            renderExtendableEntries();
                            callback(key, newKey, oldKey);
                            oldKey = newKey;
                        });

                    // Value editor
                    let valueEditor;
                    if (property.additionalProperties?.type === 'object') {
                        const entrySubEditor = new EditorGenerator(
                            entryValue,
                            property.additionalProperties.properties || {},
                            $('<div>'),
                            '',
                            customEnumFields
                        );
                        entrySubEditor.generateEditor([], {}, callback);
                        valueEditor = entrySubEditor.formContainer;
                    } else {
                        let oldValue = entryValue || '';
                        valueEditor = $('<input type="text">')
                            .addClass('property-editor-input')
                            .val(oldValue)
                            .on('change', () => {
                                const newValue = valueEditor.val();
                                subObject[entryKey] = newValue;
                                callback(entryKey, newValue, oldValue);
                                oldValue = newValue;
                            });
                    }

                    const deleteButton = $('<button>')
                        .text('x')
                        .on('click', () => {
                            const oldValue = subObject[entryKey];
                            delete subObject[entryKey];
                            renderExtendableEntries();
                            callback(entryKey, 'DELETED', oldValue);
                        });

                    entryContainer.append(keyInput, valueEditor, deleteButton);

                    const delimiter = $('<br /> <br />');
                    extendableContainer.append(entryContainer, delimiter);
                }
            };

            renderExtendableEntries();
            input = $('<div>')
                .append(extendableContainer, addButton);

            const fieldContainer = $('<div>').addClass('property-editor-field');
            fieldContainer.append(input);

            this.formContainer.append(fieldContainer);
        }
    }
}
