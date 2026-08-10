# State Schema

## Полная структура state

\\\javascript
{
rules: [
{
id: string,
name: string,
template: string, // Шаблон для заполнения
conditions: {
mode: 'AND' | 'OR',
items: [
{
selector: string, // CSS-селектор
// или
attr: string, // Атрибут
pattern: string,
useRegex: boolean
}
]
},
urlConditions: [
{
pattern: string, // URL-паттерн с *
// или
regex: string
}
],
order: number
}
],
folders: [
{
id: string,
name: string,
rules: string[] // ID правил в папке
}
],
specialInsertions: [
{
id: string,
name: string,
urlConditions: [...], // Те же, что у rules
steps: [
{
selector: string,
value: string, // Шаблон для вставки
delay: number // Задержка перед заполнением
}
]
}
],
smartCounters: [
{
id: string,
name: string,
current: number,
history: number[]
}
],
counters: {
[key: string]: number // Простые счётчики
},
snapshots: [
{
id: string,
name: string,
date: string,
data: object // Полный state
}
],
customWordLists: [
{
id: string,
name: string,
words: string[]
}
],
scraperConfig: {
enabled: boolean,
urlPatterns: string[]
},
copyfxConfig: {
enabled: boolean,
adminDomain: string
},
uaRules: [
{
userAgent: string,
urlPattern: string,
enabled: boolean
}
],
pageShortcuts: [
{
key: string,
modifiers: string[], // ['ctrl', 'shift']
action: 'fillAll' | 'fillSpecial',
urlPattern: string
}
],
activityLog: [
{
timestamp: number,
action: string,
details: object
}
]
}
\\\

## Миграции

Все миграции проходят через StateMigrator.migrate().
При добавлении новых полей обновляется ensureShape().
