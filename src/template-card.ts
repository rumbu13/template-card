/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues} from 'lit';
import { customElement, property, state } from 'lit/decorators';
import deepClone from 'deep-clone-simple';
import { HomeAssistant, getLovelace, LovelaceCard } from 'custom-card-helpers'

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

@customElement('template-card')
export class TemplateCard extends LitElement {
 
  @state() private _config?: TemplateCardConfig;
  @state() private _helpers?: any;  
  

  private _variables: any | undefined;
  private _entity: any | undefined;

  private _updateEntities: string[] = [];

  public hass?: HomeAssistant;

  public setConfig(config: TemplateCardConfig) {
    if (!config)
      throw new Error('Missing config');
    if (!config.card)
      throw new Error('Missing card');
      
    const lovelace = getLovelace() || getLovelaceCast();
    let templates: TemplateCardConfig = deepClone(config);
    templates = this._configTemplates(lovelace, templates);
    
    this._config = templates;

    this._updateEntities = [];
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

    if (this._config.entity && !this._updateEntities.includes(this._config.entity))
      this._updateEntities.push(this._config.entity)
    
    this._loadHelpers();
  }  

  protected render(): TemplateResult | void {

    const errorCard = document.createElement('hui-error-card') as LovelaceCard;

    if (!this._config) {
      errorCard.setConfig({
        type: 'error',
        error: 'Missing configuration'        
      })
      return html` ${errorCard} `
    }
    
    if (!this.hass) {
      errorCard.setConfig({
        type: 'error',
        error: 'Missing Home Assistant',
        origConfig: this._config
      })
      return html` ${errorCard} `
    }

    if (!this._helpers) {
      errorCard.setConfig({
        type: 'error',
        error: 'Helpers not loaded',
        origConfig: this._config
      })
      return html` ${errorCard} `
    }

    if (!this._config.card) {
      errorCard.setConfig({
        type: 'error',
        error: 'Missing card',
        origConfig: this._config
      })
      return html` ${errorCard} `
    }


    
    console.log('RENDER');

    try {


      this._variables = deepClone(this._config.variables);    
      if (this._variables)
        this._variables = this._evaluateObject(this._variables);

      const entity = this._config.entity;
      if (entity)
        this._entity = this.hass.states[this._evaluateObject(entity)];
      else
        this._entity = null;
      
      let config = deepClone(this._config.card);


      config = this._evaluateObject(config);


      const element = this._helpers.createCardElement(config);
      element.hass = this.hass;
      return html`
        <div id="template-card">
          ${element}
        </div>
      `;
    } catch (e: any) {

      if (e.stack) 
        console.error(e.stack);      
      else
        console.error(e);

      errorCard.setConfig({
        type: 'error',
        error: e.toString(),
        origConfig: this._config
      })
      return html` ${errorCard} `
    }
   
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {

    if (changedProps.has('_config')) {
      return true;
    }

    if (this._config) {
      if (typeof this._config.triggers === 'string' && this._config.triggers === 'all')
        return true;
      const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
      if (oldHass) {
        for (const updateEntity of this._updateEntities) {
          if (oldHass.states[updateEntity] !== this.hass?.states[updateEntity]) {
            return true;
          }          
        }
        return false;
      }            
    }
    return true;
  }

  private async _loadHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }


  public getCardSize(): number {
    return this._config?.card && typeof this._config?.card.getCardSize === 'function' ? this._config?.card.getCardSize() : 1;
  }

  private _evaluateObject(obj: any): any {
    Object.entries(obj).forEach(entry => {
        const key = entry[0];
        const value = entry[1];
        if (value !== null) {
          if (value instanceof Array) {
            obj[key] = this._evaluateArray(value);
          } else if (typeof value === 'object') {
            obj[key] = this._evaluateObject(value);
          } else if (typeof value === 'string' && value.startsWith('[[[') && value.endsWith(']]]')) {
            obj[key] = this._evaluateJS(value);
          }
        }      
    });

    return obj;
  }
  
  private _evaluateArray(array: any): any {
    for (let i = 0; i < array.length; ++i) {
      const value = array[i];
      if (value instanceof Array) {
        array[i] = this._evaluateArray(value);
      } else if (typeof value === 'object') {
        array[i] = this._evaluateObject(value);
      } else if (typeof value === 'string' && value.startsWith('[[[') && value.endsWith(']]]')) {
        array[i] = this._evaluateJS(value);
      }
    }

    return array;
  }

  private _evaluateJS(js: string): any {
    if (!js.startsWith('[[[') || !js.endsWith(']]]')) {
      return js;
    }
    try {
      return new Function('states', 'user', 'hass', 'entity', 'variables', 'html', `'use strict'; ${js.substring(3, js.length - 3)}`).call(
        this,
        this.hass?.states,
        this.hass?.user,
        this.hass,
        this._entity,
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


