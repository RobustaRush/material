# material-pagination



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                                                          | Type                  | Default     |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------- |
| `ariaLabel`    | `aria-label`    |                                                                                                                      | `string \| undefined` | `undefined` |
| `hrefTemplate` | `href-template` | URL pattern with `{page}` placeholder → renders links instead of buttons; sorting/paging then belongs to the server. | `string \| undefined` | `undefined` |
| `page`         | `page`          | Current page, 1-based.                                                                                               | `number`              | `1`         |
| `pages`        | `pages`         | Total number of pages.                                                                                               | `number`              | `1`         |
| `siblings`     | `siblings`      | Page numbers kept visible on each side of the current page.                                                          | `number`              | `1`         |
| `upTarget`     | `up-target`     | Copied onto every link as Unpoly's `up-target` (which implies following the link via fragment swap).                 | `string \| undefined` | `undefined` |


## Events

| Event                | Description | Type                             |
| -------------------- | ----------- | -------------------------------- |
| `materialPageChange` |             | `CustomEvent<{ page: number; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
