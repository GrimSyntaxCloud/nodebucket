/*
============================================
 Title: employee.interface.ts
 Author: Andres Macias
 Date:   01/15/23
 Description: contains interface for the employees
===========================================
*/

/**
 * imports the item interface from the item.interface.ts file
 * Description: This is the employee interface that will be used to create the employee interface.
 * empId: This is the id of the employee.
 * firstName: This is the first name of the employee.
 * lastName: This is the last name of the employee.
 * todo: This is the todo array of the employee.
 * done: This is the done array of the employee.
 */
import {Item} from './item.interface'

export interface Employee {
  __v: number;
  empId: number,
  firstName: string;
  lastName: string;
  todo: Item[];
  done: Item[];
}
