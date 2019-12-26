import * as moment from "moment";

export const imageFilter = (fileName: string) => {
  if (!fileName.match(/\.(jpg|jpeg|png|gif)$/)) {
    return false;
  }
  return true;
};

export const timeInRange = (
  start: moment.Moment,
  end: moment.Moment,
  cur: moment.Moment
) => {
  if (cur.isAfter(start) && cur.isBefore(end)) {
    return true;
  }
  return false;
};
