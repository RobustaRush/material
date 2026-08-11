# @viewflow/material-angular

Angular bindings for [`@viewflow/material`](https://github.com/viewflow/material) — 72 Material 3
web components as **standalone components**, with `ControlValueAccessor`s so the form controls drop
into reactive forms and `[(ngModel)]`.

Requires Angular 19 or later. Generated from the component sources on every release.

## Install

```sh
npm install @viewflow/material @viewflow/material-angular
```

## Page setup

The wrappers only bind behaviour. A page still needs the theme tokens and the icon font — see the
[main README](https://github.com/viewflow/material#quick-start). In `angular.json`:

```json
"styles": ["node_modules/@viewflow/material/css/theme.css", "src/styles.css"]
```

## Use

Import the components you need — no NgModule:

```ts
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton } from '@viewflow/material-angular';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <material-textfield formControlName="email" label="Email" type="email" required />
      <material-select formControlName="country" label="Country">
        <material-option value="us">United States</material-option>
        <material-option value="de">Germany</material-option>
      </material-select>
      <material-button type="submit" label="Save" />
    </form>
  `,
})
export class ContactComponent {
  form = new FormGroup({
    email: new FormControl(''),
    country: new FormControl('us'),
  });

  save() { console.log(this.form.value); }
}
```

- **Selectors are the tag names** (`material-textfield`), so templates read like plain HTML while
  still being type-checked against the component's inputs.
- **Change detection is detached** on every wrapper, so a component re-render never repaints the
  element; property writes run outside `NgZone`.
- **Events are `@Output()`s** — `(valueChange)`, `(materialStepChange)` — emitting the real
  `CustomEvent`, payload on `$event.detail`.
- **Value accessors** cover the text-like fields, `select`, `autocomplete`, `radio-group` (radio),
  `slider` (number) and `checkbox` / `switch` (boolean). `date-range-field` and `transfer` have no
  single value and are bound with `(valueChange)` instead.
- `DIRECTIVES` exports every wrapper as an array if you would rather import them all at once.

## Server rendering

Angular SSR renders the wrappers as their tags with projected content; the elements upgrade and
style themselves on the client. Stencil has no first-class Angular hydration path, but
`@viewflow/material/hydrate` ships in the core package if you want to pre-render the shadow content
yourself.

## Component reference

Attributes, events and methods for every component live in
[`src/components/<tag>/readme.md`](https://github.com/viewflow/material/tree/main/src/components).

## License

AGPL-3.0-or-later, with the [Viewflow Library Exception](https://github.com/viewflow/material/blob/main/LICENSE_EXCEPTION).
