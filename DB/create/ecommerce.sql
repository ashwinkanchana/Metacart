CREATE DATABASE ECOMMERCE;

USE ECOMMERCE;

show tables;

create table user (
	id int primary key auto_increment,
    fullname varchar(64) not null,
    email varchar (128) not null,
    password varchar(255) not null,
    verified boolean not null default 0,
    identifier varchar(20),
    password_reset_token varchar (255) default null,
    verification_token varchar(255) default null,
    google_id varchar(48) default null,
    role enum('user', 'admin', 'seller') not null default 'user'
);

create table category (
	id int primary key auto_increment,
    title varchar(128) not null,
    slug varchar(128) not null unique
);


create table product (
	id int primary key auto_increment,
    title varchar(255) not null,
    slug varchar(255) not null unique,
    specs varchar(2000) not null,
    price decimal(22,2) not null,
    image varchar(255) unique,
    stock int not null,
    category_id int not null,
    constraint fk_category
    foreign key (category_id)
	references category(id)
	ON DELETE CASCADE
);


create table page (
    title varchar(255) not null,
    slug varchar(255) not null unique,
    content varchar(4000) not null,
    sorting int not null
);


create table cart (
	user_id int not null,
    constraint fk_user
    foreign key (user_id)
	references user(id)
	ON DELETE CASCADE,
    product_id int not null,
    constraint fk_product
    foreign key (product_id)
	references product(id)
	ON DELETE CASCADE,
    quantity int not null
);






