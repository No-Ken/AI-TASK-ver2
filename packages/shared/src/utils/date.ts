import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('ja');

export const dateUtils = {
  now: (tz = 'Asia/Tokyo') => dayjs().tz(tz),
  
  parse: (date: string | Date, tz = 'Asia/Tokyo') => dayjs(date).tz(tz),
  
  format: (date: string | Date, format = 'YYYY/MM/DD HH:mm', tz = 'Asia/Tokyo') => 
    dayjs(date).tz(tz).format(format),
  
  toISO: (date: string | Date) => dayjs(date).toISOString(),
  
  fromNow: (date: string | Date, tz = 'Asia/Tokyo') => 
    dayjs(date).tz(tz).fromNow(),
  
  addDays: (date: string | Date, days: number, tz = 'Asia/Tokyo') => 
    dayjs(date).tz(tz).add(days, 'day'),
  
  startOfDay: (date: string | Date, tz = 'Asia/Tokyo') => 
    dayjs(date).tz(tz).startOf('day'),
  
  endOfDay: (date: string | Date, tz = 'Asia/Tokyo') => 
    dayjs(date).tz(tz).endOf('day'),
  
  isBefore: (date1: string | Date, date2: string | Date) => 
    dayjs(date1).isBefore(dayjs(date2)),
  
  isAfter: (date1: string | Date, date2: string | Date) => 
    dayjs(date1).isAfter(dayjs(date2)),
  
  isSameDay: (date1: string | Date, date2: string | Date, tz = 'Asia/Tokyo') => 
    dayjs(date1).tz(tz).isSame(dayjs(date2).tz(tz), 'day'),
};