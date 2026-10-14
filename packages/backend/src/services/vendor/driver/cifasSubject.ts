import {createHash} from 'node:crypto';

export class CifasSubjectHelper {
  public static getId(subjectIdParams: {
    caseId: number;
    firstName?: string;
    surname?: string;
    birthDate?: string;
  }): string {
    const payload =
      `${CifasSubjectHelper.normalizeString(subjectIdParams.caseId)}-` +
      `${CifasSubjectHelper.normalizeString(subjectIdParams.firstName)}-` +
      `${CifasSubjectHelper.normalizeString(subjectIdParams.surname)}-` +
      `${CifasSubjectHelper.normalizeDateLike(subjectIdParams.birthDate)}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  private static normalizeString(value: unknown): string {
    if (typeof value === 'number') {
      return `${value}`;
    }
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().toLowerCase();
  }

  private static normalizeDateLike(value: unknown): string {
    const sDate = CifasSubjectHelper.normalizeString(value);
    if (!sDate) {
      return '';
    }
    const date = new Date(sDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  }
}
