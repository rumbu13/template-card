# Template Card by [@rumbu13](https://www.github.com/rumbu13)

Teamplate them all!

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/rumbuT)

## Options

| Name              | Type      | Requirement  | Description                                 |
| ----------------- | --------- | ------------ | ------------------------------------------- |
| type              | string    | **Required** | `custom:template-card`                      |
| card              | object    | **Required** | Card to be templated                        |
| entity            | string    | **Optional** | Accesible in code as `entity`               |
| triggers          | string[]  | **Optional** | Entity list triggering updates              |
| variables         | dictionary| **Optional** | Accessible in code as `variables'           |
| templates         | string[]  | **Optional** | Inherited merged templates                  |

## Card

Currently, card is the only supported element. Each field of the card is interpreted as javascript
code if it's surrounded by tripple brackets `[[[ ... ]]]`.

```yaml
card:
  type: 'vertical-stack'
```

### Entity

Optional `entity_id` that can be used as a named variable inside the javascript code. The entity field
can contain javascript code but cannot reference variables.

```yaml
entity: climate.bedroom_thermostat

```

### Triggers

By default, `custom:template-card` will look into your javascript code and will extract all entities
that triggers updates. Otherwise, you can specify one or more entities which will trigger the update.
You can also use `all` as value to trigger updates at any change in Home Assistant. The `entity` field
is automatically considered for updates, there is no need to include it explicitely.

```yaml
triggers: light.smart_bulb
```

```yaml
triggers:
- binary_sensor.bedroom_door_contact
- binary_sensor.bedroom_motion
```

```yaml
triggers: all
```

### Variables

Variables are optional keys which can contain javascript code and can be refrenced in other fields by
prefixing them with `variables`. Please note that variables can refer in javascript code other
variables as long as they are declared previously. Also, variables can access teh entity field simply by `entity`

```yaml
variables:
  v1: simple string
  v2: "[[[ return variables.v1; ]]]
```

### Templates

Templates are partial definitions of `custom:template-card` that can be merged. You can specify one or more
templates at the beginning of your yaml file under the special record `template_card_templates`. Please note
that order is important, the last template wins if there are common fields in several templates. Order is also
important when referencing variables: variables from the last template can reference variables from previous
template, but not the other way.

```yaml
templates: my_super_button
```

```yaml
templates:
- my_super_button
- translated_values
```

### Example

```yaml

type: custom:template_card
entity: climate.living_room_ac
card:
  type: tile
  entity: "[[[ return entity.entity_id; ]]]"
  name: "[[[ return entity.attributes.friendly_name ?? 'Unknown'; ]]]"

```

## Predefined variables

When writing javascript code, the following variables are available:

- `hass` - Home Assistant object containing all configuration, states, user settings, etc.
- `states` - Current states of entities.
- `user' - Current user.
- `entity` - Context dependent, any object containing a entity key will have access to the
  corresponding entity through this variable.

Given the following object:

```yaml
type: custom:template-card
entity: sensor.x
variables:
  var: "[[[ return entity?.state; ]]]"
card:
  type: custom:mushroom-entity-card
  entity: sensor.y
  name: "[[[ return entity?.state * 100; ]]]
```

In the first case. `entity` will refer to `sensor.x`, in the second case, it will refer to `sensor.y`.


## Templating

Templates must be defined at the beginning of the yaml file (or in the raw configuration editor in UI mode)
under the special key `template_card_templates`

```yaml

template_card_templates:
  defaults:
    variables:
      default_name: "[[[ return entity.attributes.friendly_name; ]]]"
      default_icon: "[[[ return entity.attributes.icon; ]]]" 

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

```yaml
type: custom:template-card
template: some_card
```

[commits-shield]: https://img.shields.io/github/commit-activity/y/rumbu13/template-card.svg?style=for-the-badge
[commits]: https://github.com/rumbu13/template-card/commits/master
[maintenance-shield]: https://img.shields.io/maintenance/yes/2023.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/rumbu13/template-card.svg?style=for-the-badge
[releases]: https://github.com/rumbu13/template-card/releases
