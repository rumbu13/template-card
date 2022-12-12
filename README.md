# Template Card by [@rumbu13](https://www.github.com/rumbu13)

A community driven template of best practices for Home Assistant Lovelace custom cards

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/rumbuT)

## Options

| Name              | Type    | Requirement  | Description                                 |
| ----------------- | ------- | ------------ | ------------------------------------------- |
| type              | string  | **Required** | `custom:template-card`                      |
| card              | object  | **Required** | Card name                                   |
| entity            | string  | **Optional** | This can be used as variable `entity`       |
| triggers          | string[]| **Optional** | Show what a warning looks like for the card |
| variables         | string[]| **Optional** | These can be used as `variables.name`       |
| templates         | string[]| **Optional** | Inherited templates                         |

## Card

Currently, card is the only supported element. Each field of the card is interpreted as javascript
code if it's surrounded by tripple brackets `[[[ ... ]]]`.

### Entity

Optional `entity id` that can be used as a named variable inside the javascript code

### Triggers

By default, `custom:template-card` will look in your javascript code and will extract all entities
that triggers updates. Otherwise, you can specify one or more entities which will trigger the update.
You can also use `all` as value to trigger updates at any change in Home Assystant.

### Variables

Variables are optional keys which can contain javascript code and can be refrenced in other fields by
prefixing them with `variables`. Please note that variables can refer in javascript code other
variables as long as they are declared previously.

### Templates

Templates are partial definitions of `custom:template-card` that can be merged. You can specify one or more
templates at the beginning of your yaml file under the special record `template_card_templates`.

### Example

```

type: custom:template_card
entity: climate.living_room_ac
card:
  type: tile
  entity: "[[[ return entity.entity_id; ]]]
  name: "[[[ return entity.attributes.friendly_name ?? 'Unknown'; ]]]

```

## Templating

Templates must be defined at the beginning of the yaml file (or in the raw configuration editor in UI mode)
under special key `template_card_templates`

### Example

```
template_card_templates:
  defaults:
    variables:
      default_name: "[[[ return entity.attributes.friendly_name; ]]] 
      default_icon: "[[[ return entity.attributes.icon; ]]] 

  some_card:
    templates:
    - defaults
    card:
      type: tile
      entity: "[[[ return entity.entity_id; ]]]"
      name: "[[[ return variables.default_name; ]]]"
      icon: "[[[ return variables.default_icon; ]]]"

```

Later you can create a template card using the above template(s). Please note that the second template (`some_card`)
already reference template `defaults`

```
type:custom:template-card
template: some_card
```


[commits-shield]: https://img.shields.io/github/commit-activity/y/rumbu13/template-card.svg?style=for-the-badge
[commits]: https://github.com/rumbu13/template-card/commits/master
[devcontainer]: https://code.visualstudio.com/docs/remote/containers
[maintenance-shield]: https://img.shields.io/maintenance/yes/2021.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/rumbu13/template-card.svg?style=for-the-badge
[releases]: https://github.com/rumbu13/template-card/releases
