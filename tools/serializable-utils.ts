/**
 * 
 * @param object 
 */
export function safeJSONStringify(object:any):string{
  try{
    if(object){
      return JSON.stringify(object);
    }
    return null;
  }
  catch(e){
    console.error(e);
    return null;
  }
}

/**
 * 
 * @param objectStrigified 
 */
export function safeJSONParse(objectStrigified:string):any{
  try{
    if(objectStrigified){
      return JSON.parse(objectStrigified);
    }
    return null;
  }
  catch(e){
    console.error(e);
    return null;
  }
}