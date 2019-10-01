import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { createDropdown, addListToDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import WikiFormView from './ui/wikiformview';
import Collection from '@ckeditor/ckeditor5-utils/src/collection';
import Model from '@ckeditor/ckeditor5-ui/src/model';
import wikiIcon from './theme/icons/wiki.svg';
import axios from 'axios';

/**
 * Wiki plugin
 */

export default class Wiki extends Plugin {

    static get pluginName() {
        return 'wiki';
    }

    init() {
        const editor = this.editor;

        /**
         * The form view displayed inside the drop-down
         */
        this.form = new WikiFormView(getFormValidators(editor.t), editor.locale);
        // creation and setup of the dropdown
        editor.ui.componentFactory.add('wiki', locale => {
            const dropdown = createDropdown(locale);

            this._setUpDropdown(dropdown, this.form);
            this._setUpForm(this.form, dropdown);
            return dropdown;
        });
    }

    _setUpDropdown(dropdown, form) {
        const editor = this.editor;
        const t = editor.t;
        const button = dropdown.buttonView;

        dropdown.panelView.children.add(form);

        button.set({
            label: t('Insert wiki'),
            icon: wikiIcon,
            tooltip: true
        });

        // Note: Use the low priority to make sure the following listener starts working after the
        // default action of the drop-down is executed (i.e. the panel showed up). Otherwise, the
        // invisible form/input cannot be focused/selected.
        button.on('open', () => {
            // Make sure that each time the panel shows up, the URL field remains in sync with the value of
            // the command. If the user typed in the input, then canceled (`urlInputView#value` stays
            // unaltered) and re-opened it without changing the value of the media command (e.g. because they
            // didn't change the selection), they would see the old value instead of the actual value of the
            // command.
            form.url = '';
            form.urlInputView.select();
            form.focus();
        }, { priority: 'low' });

        dropdown.on('submit', () => {
            if (form.isValid()) {
                findWiki();
            }
        });

        dropdown.on('change:isOpen', () => form.resetFormStatus());
        dropdown.on('cancel', () => closeUI());

        function closeUI() {
            let panelContent = dropdown.panelView.element.childNodes;
            let panelContentArr = Array.from(panelContent);

            editor.editing.view.focus();
            dropdown.isOpen = false;
            // remove list items in the panel when dropdown closes
            if (panelContentArr.length !== 1) {
                panelContent[1].remove();
            }
        }

        function findWiki() {
            axios.get("https://jsonplaceholder.typicode.com/posts?_limit=7")
                .then(response => {
                    const items = new Collection();
                    let dataP = response.data;
                    let panelContent = dropdown.panelView.element.childNodes;
                    let panelContentArr = Array.from(panelContent);

                    // removes list items in the panel before showing new items
                    if (panelContentArr.length !== 1) {
                        panelContent[1].remove();
                    }

                    // restricts the items shown in the panel to 5 items
                    if (dataP.length <= 5) {
                        for (let i = 0; i < dataP.length; i++) {
                            items.add({
                                type: "button",
                                model: new Model({
                                    label: dataP[i].title,
                                    withText: true
                                })
                            });
                        }
                    } else {
                        for (let i = 0; i < 5; i++) {
                            items.add({
                                type: "button",
                                model: new Model({
                                    label: dataP[i].title,
                                    withText: true
                                })
                            });
                        }
                    }

                    // adding items to dropdown panel
                    addListToDropdown(dropdown, items);

                    //wiki items list
                    const wikiList = dropdown.listView.element.childNodes;

                    // tracks which item is selected and returns the data accordingly
                    wikiList.forEach(function (value, index) {
                        wikiList[index].addEventListener("click", function () {
                            editor.model.change(writer => {
                                const insertPosition = editor.model.document.selection.getFirstPosition();
                                const wikiTitle = dataP[index].title;
                                const wikiLink = dataP[index].body;

                                writer.insertText(wikiTitle, { linkHref: wikiLink }, insertPosition);
                                closeUI();
                            });
                        });
                    });
                });
        }
    }

    _setUpForm(form, dropdown) {
        form.delegate('submit', 'cancel').to(dropdown);
    }
}

function getFormValidators(t) {
    return [
        form => {
            if (!form.url.length) {
                return t('عنوان نباید خالی باشد');
            }
        }
    ]
}