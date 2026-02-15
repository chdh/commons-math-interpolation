// Browser DOM utilities.

export function getInputElement(elementId: string) : HTMLInputElement {
   const e = <HTMLInputElement>document.getElementById(elementId);
   if (!e) {
      throw new Error("No HTML element found with ID \"" + elementId + "\".");
   }
   return e;
}

function getInputElementLabelText(e: HTMLInputElement) : string {
   let s = (e.labels && e.labels.length > 0) ? e.labels[0].textContent ?? "" : "";
   if (s.length > 0 && s[s.length - 1] == ":") {
      s = s.substring(0, s.length - 1);
   }
   return s;
}

function checkValidity(e: HTMLInputElement) {
   if (!e.checkValidity()) {
      const labelText = getInputElementLabelText(e);
      const info = labelText ? ` with label "${labelText}"` : e.id ? ` with ID "${e.id}"` : "";
      throw new Error("Invalid value in input field" + info + ".");
   }
}

export function getValue(elementId: string) : string {
   const e = getInputElement(elementId);
   checkValidity(e);
   return e.value;
}

export function setValue(elementId: string, newValue: string) {
   getInputElement(elementId).value = newValue;
}

export function getValueNum(elementId: string, defaultValue: number = NaN) : number {
   const e = getInputElement(elementId);
   checkValidity(e);
   if (e.value == "") {
      return defaultValue;
   }
   return e.valueAsNumber;
}

export function setValueNum(elementId: string, newValue: number, emptyValue: number = NaN) {
   const e = getInputElement(elementId);
   if (isNaN(newValue) || newValue == emptyValue) {
      e.value = "";
   } else {
      e.valueAsNumber = newValue;
   }
}

//--- Field info ---------------------------------------------------------------

let visibleInfoTextElement: HTMLDivElement | undefined = undefined;

function prepareFieldInfo2 (fieldElement: HTMLElement) {
   const infoButtonElement = document.createElement("div");
   infoButtonElement.className = "fieldInfoButton";
   fieldElement.appendChild(infoButtonElement);
   const infoTextElement = document.createElement("div");
   const infoText = fieldElement.dataset.info!;
   infoTextElement.innerHTML = infoText;
   infoTextElement.className = "fieldInfoText hidden";
   fieldElement.appendChild(infoTextElement);
   infoButtonElement.addEventListener("click", (_event: Event) => {
      if (visibleInfoTextElement && visibleInfoTextElement != infoTextElement) {
         visibleInfoTextElement.classList.add("hidden");
      }
      const hidden = infoTextElement.classList.toggle("hidden");
      visibleInfoTextElement = hidden ? undefined : infoTextElement;
   });
}

export function prepareFieldInfo() {
   for (const fieldElement of <NodeListOf<HTMLElement>>document.querySelectorAll("div[data-info]")) {
      prepareFieldInfo2(fieldElement);
   }
   document.addEventListener("click", (event: Event) => {
      if (!visibleInfoTextElement || !(event.target instanceof Node)) {
         return;
      }
      const fieldElement = <HTMLElement>visibleInfoTextElement.parentNode;
      if (fieldElement?.contains(event.target)) {
         return;
      }
      // Handle a click somewhere outside of the current field and it's sub-elements.
      visibleInfoTextElement.classList.add("hidden");
      visibleInfoTextElement = undefined;
   });
}
