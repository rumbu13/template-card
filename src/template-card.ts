/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues} from 'lit';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { customElement, property, state } from 'lit/decorators';
import deepClone from 'deep-clone-simple';
import { HomeAssistant, getLovelace, LovelaceCard, createThing, LovelaceCardConfig } from 'custom-card-helpers'

import type { TemplateCardConfig } from './types';
import { CARD_VERSION } from './const';


console.info(
  `%c  TEMPLATE-CARD \n%c VERSION: ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'template-card',
  name: 'Template Card',
  description: 'Template them!',
});

const helpers = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('template-card')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TemplateCard extends LitElement {
 
  @state() private _config?: TemplateCardConfig;  
  @state() private _card? : LovelaceCard;
  @state() private _hass? : HomeAssistant;

  private _variables: any | undefined;
  private _entity: any | undefined;  
  private _updateEntities: string[] = [];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._card) {
      this._card.hass = hass;
    }      
  }

  public setConfig(config: TemplateCardConfig) {
    if (!config)
      throw new Error('Missing config');
            
    const lovelace = getLovelace() || getLovelaceCast();
    let templates: TemplateCardConfig = deepClone(config);
    templates = this._configTemplates(lovelace, templates);
    
    this._config = templates;

    if (!config.card)
      throw new Error('Missing card');
    

  }  


  protected render(): TemplateResult | void {


    if (!this._hass || !this._config) {
      return html``;
    }

    this._reevaluate();


    let cardConfig = deepClone(this._config.card);
    cardConfig = this._evaluateObject(cardConfig, this._entity);
        
    let card = this._config.card;
    card = createThing(cardConfig);

    if (card) {
      card.hass = this._hass;

      return html`
        <div id="template-card">
          ${card}
        </div>
      `;
    }
    else {
      return html``;
    }    
   
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {

    if (changedProps.has('_config')) {
      return true;
    }

    if (this._config) {
      if (typeof this._config.triggers === 'string' && this._config.triggers === 'all')
        return true;
      const oldHass = changedProps.get('_hass') as HomeAssistant | undefined;
      if (oldHass) {
        for (const updateEntity of this._updateEntities) {
          if (oldHass.states[updateEntity] !== this._hass?.states[updateEntity]) {
            return true;
          }          
        }
        return false;
      }            
    }
    return true;
  }


  public getCardSize(): number | Promise<number> {
    return this._card && typeof this._card.getCardSize === 'function' ? this._card.getCardSize() : 1;
  }

  private _evaluateVariables(entity: any) {
    this._variables = {};
    if (this._config) {
      this._variables = deepClone(this._config.variables);    
      if (this._variables)
        this._variables = this._evaluateObject(this._variables, entity);
    }
  }

  private _evaluateEntity() {
    this._entity = undefined;
    if (this._config?.entity)
      this._entity = this._hass?.states[this._evaluateObject(this._config.entity, null)];
  }




  private _reevaluate() {

    this._variables = {};
    this._entity = undefined;
    this._updateEntities = [];    

    if (this._hass) {
      this._evaluateTriggers();
      this._evaluateEntity();
      this._evaluateVariables(this._entity);
      if (this._entity && !this._updateEntities.includes(this._entity.entity_id)) {    
        this._updateEntities.push(this._entity.entity_id);
      }
    }

  }  

  private _evaluateTriggers() {    
    this._updateEntities = [];
    if (this._config)
    {
      if (Array.isArray(this._config.triggers))    
        this._updateEntities = [...this._config.triggers]
      else if (typeof this._config.triggers === 'string' && this._config.triggers !== 'all')
        this._updateEntities.push(this._config.triggers);
        
      const r1 = new RegExp(/states\[\s*('|\\")([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\1\s*\]/, 'gm');
      const r2 = new RegExp(/states\[\s*('|\\")([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\1\s*\]/, 'm');

      const matched = JSON.stringify(this._config).match(r1);
      matched?.forEach(match => {
        const m = match.match(r2);
        if (m && !this._updateEntities.includes(m[2]))
          this._updateEntities.push(m[2]);
      });
      
    }
    
  }
  
  private _evaluateObject(obj: any, entity: any): any {

    const newEntityId = this._evaluateJS(obj?.['entity'], entity);
    const newEntity = this._hass?.states[newEntityId] ?? entity;
    if (newEntityId) {
      obj['entity'] = newEntityId;
    }    

    Object.entries(obj).forEach(entry => {
        const key = entry[0];
        const value = entry[1];
        if (value !== null) {
          if (value instanceof Array) {
            obj[key] = this._evaluateArray(value, newEntity);
          } else if (typeof value === 'object') {
            obj[key] = this._evaluateObject(value, newEntity);
          } else if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed.startsWith('[[[') && trimmed.endsWith(']]]')) {
                obj[key] = this._evaluateJS(trimmed, newEntity);
              }          
          } 
        }      
    });
    return obj;
  }
  
  private _evaluateArray(array: any, entity: any): any {
    for (let i = 0; i < array.length; ++i) {
      const value = array[i];
      if (value instanceof Array) {
        array[i] = this._evaluateArray(value, entity);
      } else if (typeof value === 'object') {
        array[i] = this._evaluateObject(value, entity);
      } else if (typeof value === 'string' && value.startsWith('[[[') && value.endsWith(']]]')) {
        array[i] = this._evaluateJS(value, entity);
      }
    }

    return array;
  }

  private _evaluateJS(js: string, entity: any): any {

    if (!js)
      return js;

    if (!js.startsWith('[[[') || !js.endsWith(']]]')) {
      return js;
    }

    try {
      return new Function('states', 'user', 'hass', 'entity', 'variables', 'html', 
        `'use strict'; ${js.substring(3, js.length - 3)}`).call(
        this,
        this._hass?.states,
        this._hass?.user,
        this._hass,
        entity,
        this._variables,
        html
      );
    } catch (e) {
      return js;      
    }
  }

  private _configTemplates(lovelace: any, config: any) : TemplateCardConfig {
    if (!config?.templates)
      return config;

    let result: any = {};
    const templates = config.templates && Array.isArray(config.templates) ? config.templates : [config.templates];
    templates.forEach(template => {
      if (!lovelace.config.template_card_templates?.[template])
        throw new Error(`Missing template: '${template}'`);
      const res = this._configTemplates(lovelace, lovelace.config.template_card_templates?.[template]);
      result = deepMerge(result, res);
    });

    result = deepMerge(result, config);
    return result as TemplateCardConfig;
  }


}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function deepMerge(...objects: any): any {
  const isObject = (obj: any) => obj && typeof obj === 'object';

  return objects.reduce((prev: any, obj: any) => {
    Object.keys(obj).forEach((key) => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal);
      } else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = deepMerge(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, {});
}

export function getLovelaceCast(): any {
  let root: any = document.querySelector('hc-main');
  root = root && root.shadowRoot;
  root = root && root.querySelector('hc-lovelace');
  root = root && root.shadowRoot;
  root = root && (root.querySelector('hui-view') || root.querySelector('hui-panel-view'));
  if (root) {
    const ll = root.lovelace;
    ll.current_view = root.___curView;
    return ll;
  }
  return null;
}


