import { moment } from 'entcore';

export class Utils {
    static getDateAsMoment (date) {
        var momentDate;
        if (moment.isMoment(date)) {
            momentDate = date;
        }
        else if (typeof date !== 'string' && date.$date) {
            momentDate = moment(date.$date);
        } else if (typeof date === 'number'){
            momentDate = moment.unix(date);
        } else {
            momentDate = moment(date);
        }
        return momentDate;
    }
}