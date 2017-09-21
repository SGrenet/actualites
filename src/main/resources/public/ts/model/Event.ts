import { Model } from 'entcore';

export class Event extends Model {
    constructor (data?) {
        super();
        if (data) {
            for (let key in data) {
                this[key] = data[key];
            }
        }
    }
}