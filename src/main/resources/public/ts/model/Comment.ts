import { Model } from 'entcore';

export class Comment extends Model {
    constructor (data?) {
        super();
        if (data) {
            for (let key in data) {
                this[key] = data[key]
            }
        }
    }
}